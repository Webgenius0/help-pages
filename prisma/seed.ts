import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Clear all data (in correct order to respect foreign keys)
  console.log('🗑️  Clearing existing data...');
  
  await prisma.pageFeedback.deleteMany();
  await prisma.pageView.deleteMany();
  await prisma.searchQuery.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.pageRevision.deleteMany();
  await prisma.page.deleteMany();
  // Delete sections within docItems first
  await (prisma as any).$executeRaw`DELETE FROM nav_headers WHERE doc_item_id IS NOT NULL`;
  // Delete docItems
  await (prisma as any).$executeRaw`DELETE FROM doc_items`;
  // Delete top-level navHeaders
  await (prisma as any).$executeRaw`DELETE FROM nav_headers WHERE doc_item_id IS NULL AND parent_id IS NULL`;
  await prisma.doc.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('✅ Database cleared\n');

  // Create users
  console.log('👤 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedPassword,
      fullName: 'Admin User',
      role: 'admin',
      isPublic: true,
      bio: 'Administrator of the documentation platform',
    },
  });

  // Create editor with createdBy set to admin (if column exists)
  let editor: any;
  try {
    editor = await prisma.user.create({
      data: {
        email: 'editor@example.com',
        username: 'editor',
        password: hashedPassword,
        fullName: 'Editor User',
        role: 'editor',
        isPublic: true,
        bio: 'Content editor',
        createdBy: admin.id, // Editor created by admin
      } as any,
    });
  } catch (error: any) {
    // If createdBy column doesn't exist yet, create without it
    if (
      error.message?.includes("created_by") ||
      error.message?.includes("does not exist")
    ) {
      // Check if column exists first
      const columnExists = await (prisma as any).$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'created_by'
      `;

      if (columnExists.length === 0) {
        // Column doesn't exist yet - create without createdBy
        editor = await prisma.user.create({
          data: {
            email: 'editor@example.com',
            username: 'editor',
            password: hashedPassword,
            fullName: 'Editor User',
            role: 'editor',
            isPublic: true,
            bio: 'Content editor',
          },
        });
      } else {
        // Column exists but Prisma client hasn't been regenerated - use raw SQL
        const result = await (prisma as any).$queryRaw`
          INSERT INTO users (email, username, password, full_name, role, is_public, bio, created_by, created_at, updated_at)
          VALUES (${'editor@example.com'}, ${'editor'}, ${hashedPassword}, ${'Editor User'}, ${'editor'}, true, ${'Content editor'}, ${admin.id}, NOW(), NOW())
          RETURNING id, email, username, full_name as "fullName", role, is_public as "isPublic", bio, created_at as "createdAt"
        `;
        editor = result[0];
      }
    } else {
      // Re-throw other errors
      throw error;
    }
  }

  console.log(`✅ Created users: ${admin.username}, ${editor.username}\n`);

  // Helper function to generate CUID-like ID
  const generateId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `c${timestamp}${random}`;
  };

  // Helper function to create a page with content
  const createPage = async (data: {
    docId: string;
    docItemId: string;
    navHeaderId?: string | null;
    userId: string;
    title: string;
    slug: string;
    summary: string;
    content: string;
    position: number;
  }) => {
    return await (prisma as any).page.create({
      data: {
        ...data,
        status: 'published',
        publishedAt: new Date(),
      },
    });
  };

  // Create 2 documentation projects
  console.log('📚 Creating documentation projects...');
  
  const apiDoc = await (prisma as any).doc.create({
    data: {
      userId: admin.id,
      title: 'API Documentation',
      slug: 'api-docs',
      description: 'Complete API reference and guides for developers',
      isPublic: true,
    },
  });

  const platformDoc = await (prisma as any).doc.create({
    data: {
      userId: admin.id,
      title: 'Platform Documentation',
      slug: 'platform-docs',
      description: 'Platform features, guides, and tutorials',
      isPublic: true,
    },
  });

  console.log(`✅ Created docs: ${apiDoc.title}, ${platformDoc.title}\n`);

  // Function to seed a doc with 5 dropdowns
  const seedDoc = async (doc: any, docName: string) => {
    console.log(`📂 Seeding ${docName}...`);
    
    const dropdownNames = [
      ['Products', 'Build', 'Manage', 'Reference', 'Resources'],
      ['Getting Started', 'Guides', 'Tutorials', 'Examples', 'Resources']
    ];
    const dropdownList = docName === 'API Docs' ? dropdownNames[0] : dropdownNames[1];
    
    // Create 5 dropdowns (NavHeaders)
    const dropdowns = [];
    for (let i = 0; i < 5; i++) {
      const dropdown = await (prisma as any).navHeader.create({
        data: {
          docId: doc.id,
          label: dropdownList[i],
          slug: dropdownList[i].toLowerCase().replace(/\s+/g, '-'),
          position: i,
          parentId: null,
          docItemId: null,
        },
      });
      dropdowns.push(dropdown);
      console.log(`  ✓ Created dropdown: ${dropdown.label}`);
    }

    // For each dropdown, create 3 items (DocItems)
    for (const dropdown of dropdowns) {
      const itemNames = [
        ['Database', 'Auth', 'Storage'],
        ['Realtime', 'Edge Functions', 'Storage'],
        ['Dashboard', 'CLI', 'API'],
        ['REST API', 'GraphQL API', 'Webhooks'],
        ['SDKs', 'Tools', 'Examples'],
      ];
      
      const itemList = dropdown.label === 'Products' || dropdown.label === 'Getting Started' 
        ? itemNames[0] 
        : dropdown.label === 'Build' || dropdown.label === 'Guides'
        ? itemNames[1]
        : dropdown.label === 'Manage' || dropdown.label === 'Tutorials'
        ? itemNames[2]
        : dropdown.label === 'Reference' || dropdown.label === 'Examples'
        ? itemNames[3]
        : itemNames[4];

      const items = [];
      for (let i = 0; i < 3; i++) {
        const itemResult = await (prisma as any).$queryRaw`
          INSERT INTO doc_items (id, nav_header_id, label, slug, description, position, is_default, created_at, updated_at)
          VALUES (
            ${generateId()},
            ${dropdown.id},
            ${itemList[i]},
            ${itemList[i].toLowerCase().replace(/\s+/g, '-')},
            ${`Documentation for ${itemList[i]}`},
            ${i},
            ${i === 0},
            NOW(),
            NOW()
          )
          RETURNING id, nav_header_id as "navHeaderId", label, slug, description, position, is_default as "isDefault", created_at as "createdAt", updated_at as "updatedAt"
        `;
        items.push(itemResult[0]);
        console.log(`    ✓ Created item: ${itemList[i]}`);
      }

      // For each item, create pages and sections
      for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        
        // Create 3+ pages directly in the item
        const pageTitles = [
          [`${item.label} Overview`, `Getting Started with ${item.label}`, `${item.label} Configuration`],
          [`${item.label} Quick Start`, `${item.label} Setup Guide`, `${item.label} Best Practices`],
          [`${item.label} Introduction`, `${item.label} Concepts`, `${item.label} Architecture`],
        ];
        const pagesList = pageTitles[itemIdx] || pageTitles[0];
        
        for (let pageIdx = 0; pageIdx < pagesList.length; pageIdx++) {
          const title = pagesList[pageIdx];
          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          
          await createPage({
            docId: doc.id,
            docItemId: item.id,
            navHeaderId: null,
            userId: admin.id,
            title,
            slug,
            summary: `Learn about ${title.toLowerCase()}`,
            content: `# ${title}

This is a comprehensive guide to ${title.toLowerCase()}. 

## Overview

${item.label} is a powerful feature that enables you to build robust and scalable applications. This documentation will guide you through everything you need to know.

### Key Features

- **Feature 1**: Description of the first key feature and how it benefits your development workflow
- **Feature 2**: Description of the second key feature with examples and use cases
- **Feature 3**: Description of the third key feature and integration possibilities

## Getting Started

### Prerequisites

Before you begin, make sure you have:

- A basic understanding of web development
- Node.js 18+ or Python 3.8+ installed
- Your development environment configured
- Access to the dashboard and API keys

### Installation

#### Step 1: Setup

The first step is to set up your environment. Follow these instructions carefully to ensure everything works correctly.

\`\`\`bash
npm install @example/sdk
\`\`\`

Or if you're using Python:

\`\`\`python
pip install example-sdk
\`\`\`

#### Step 2: Configuration

Once installed, you need to configure your SDK with your project credentials.

\`\`\`javascript
import { createClient } from '@example/sdk'

const client = createClient({
  url: 'https://your-project.example.com',
  anonKey: 'your-anon-key'
})
\`\`\`

#### Step 3: First Request

Make your first request to verify everything is working:

\`\`\`javascript
const { data, error } = await client
  .from('users')
  .select('*')
\`\`\`

## Core Concepts

### Understanding the Architecture

The architecture of ${item.label} is designed for scalability and performance. Here's how it works:

1. **Request Layer**: Handles incoming requests and validates authentication
2. **Processing Layer**: Processes business logic and data transformations
3. **Storage Layer**: Manages data persistence and retrieval

### Data Flow

Understanding data flow is crucial for building efficient applications:

- Requests come in through the API gateway
- They are processed according to your business rules
- Results are returned to the client
- Events are emitted for real-time updates

## Advanced Usage

### Performance Optimization

To get the best performance:

- Use connection pooling
- Implement caching strategies
- Optimize your queries
- Monitor resource usage

### Security Best Practices

Security is paramount:

- Always use HTTPS
- Implement proper authentication
- Validate all inputs
- Follow the principle of least privilege

### Error Handling

Proper error handling ensures a smooth user experience:

\`\`\`javascript
try {
  const result = await client.from('table').select('*');
} catch (error) {
  console.error('Error:', error.message);
  // Handle error appropriately
}
\`\`\`

## Examples

### Basic Example

Here's a simple example to get you started:

\`\`\`javascript
const { data, error } = await client
  .from('posts')
  .select('*, author:users(*)')
  .eq('status', 'published')
\`\`\`

### Advanced Example

For more complex scenarios:

\`\`\`javascript
const { data, error } = await client
  .from('orders')
  .select(\`
    *,
    customer:customers(*),
    items:order_items(
      *,
      product:products(*)
    )
  \`)
  .eq('status', 'completed')
  .order('created_at', { ascending: false })
  .limit(10)
\`\`\`

## Troubleshooting

### Common Issues

**Issue 1**: Connection timeout
- Solution: Check your network connection and firewall settings

**Issue 2**: Authentication errors
- Solution: Verify your API keys and tokens are correct

**Issue 3**: Rate limiting
- Solution: Implement exponential backoff and respect rate limits

## Next Steps

- Read the [Advanced Guide](/docs/${doc.slug}/advanced-guide)
- Check out [Examples](/docs/${doc.slug}/examples)
- Join our [Community](/community)
- Visit our [Blog](/blog)

## Additional Resources

- [API Reference](/docs/${doc.slug}/api-reference)
- [SDKs and Libraries](/docs/${doc.slug}/sdks)
- [Support Center](/support)`,
            position: pageIdx,
          });
          console.log(`      ✓ Created page: ${title}`);
        }

        // Create 2 sections (NavHeaders within the item)
        const sectionNames = [
          ['Getting Started', 'Guides'],
          ['Tutorials', 'Examples'],
          ['Reference', 'API'],
        ];
        const sectionsList = sectionNames[itemIdx] || sectionNames[0];
        
        const sections = [];
        for (let secIdx = 0; secIdx < 2; secIdx++) {
          const section = await (prisma as any).navHeader.create({
            data: {
              docId: doc.id,
              docItemId: item.id,
              label: `${item.label} ${sectionsList[secIdx]}`,
              slug: `${item.slug}-${sectionsList[secIdx].toLowerCase().replace(/\s+/g, '-')}`,
              position: secIdx,
              parentId: null,
            },
          });
          sections.push(section);
          console.log(`      ✓ Created section: ${section.label}`);

          // Create 2 pages within this section
          for (let secPageIdx = 0; secPageIdx < 2; secPageIdx++) {
            const secPageTitle = `${sectionsList[secIdx]} Page ${secPageIdx + 1}`;
            const secPageSlug = `${section.slug}-page-${secPageIdx + 1}`;
            
            await createPage({
              docId: doc.id,
              docItemId: item.id,
              navHeaderId: section.id,
              userId: admin.id,
              title: secPageTitle,
              slug: secPageSlug,
              summary: `Content for ${secPageTitle}`,
              content: `# ${secPageTitle}

## Introduction

This page provides detailed information about ${item.label} ${sectionsList[secIdx]}. 

## Main Content

${item.label} ${sectionsList[secIdx]} is an essential part of your development workflow. This guide will help you understand how to effectively use this feature.

### Detailed Explanation

Understanding the nuances of this feature is important:

- **Aspect 1**: Detailed explanation of the first aspect
- **Aspect 2**: Detailed explanation of the second aspect  
- **Aspect 3**: Detailed explanation of the third aspect

## Step-by-Step Guide

Follow these steps to get started:

1. **Step One**: Detailed instructions for the first step
2. **Step Two**: Detailed instructions for the second step
3. **Step Three**: Detailed instructions for the third step

## Code Examples

Here are some practical examples:

\`\`\`javascript
// Example code
const example = async () => {
  // Implementation details
  return result;
};
\`\`\`

## Best Practices

When working with this feature:

- Always follow security guidelines
- Implement proper error handling
- Use appropriate design patterns
- Document your code

## Conclusion

This concludes our guide on ${secPageTitle}. For more information, check out our other documentation pages.`,
              position: secPageIdx,
            });
            console.log(`        ✓ Created page in section: ${secPageTitle}`);
          }

          // Create 1 subsection within this section
          const subsection = await (prisma as any).navHeader.create({
            data: {
              docId: doc.id,
              docItemId: item.id,
              label: `${section.label} - Advanced`,
              slug: `${section.slug}-advanced`,
              position: 0,
              parentId: section.id, // Subsection
            },
          });
          console.log(`        ✓ Created subsection: ${subsection.label}`);

          // Create 1 page within the subsection
          const subPageTitle = `${subsection.label} Content`;
          const subPageSlug = `${subsection.slug}-content`;
          
          await createPage({
            docId: doc.id,
            docItemId: item.id,
            navHeaderId: subsection.id,
            userId: admin.id,
            title: subPageTitle,
            slug: subPageSlug,
            summary: `Advanced content for ${subsection.label}`,
            content: `# ${subPageTitle}

## Advanced Topics

This section covers advanced topics related to ${item.label}.

### Advanced Concepts

- **Concept 1**: Deep dive into the first advanced concept
- **Concept 2**: Deep dive into the second advanced concept

## Implementation Details

### Architecture

The architecture for advanced usage involves:

1. Complex setup procedures
2. Advanced configuration options
3. Performance tuning

### Examples

\`\`\`javascript
// Advanced example
const advancedExample = async () => {
  // Complex implementation
};
\`\`\``,
            position: 0,
          });
          console.log(`          ✓ Created page in subsection: ${subPageTitle}`);
        }
      }
    }
    
    console.log(`✅ Completed seeding ${docName}\n`);
  };

  // Seed both docs
  await seedDoc(apiDoc, 'API Docs');
  await seedDoc(platformDoc, 'Platform Docs');

  console.log('🎉 Seeding completed successfully!\n');
  console.log('📝 Sample credentials:');
  console.log('   Admin: admin@example.com / password123');
  console.log('   Editor: editor@example.com / password123\n');
  console.log('🔗 Visit your docs at:');
  console.log(`   http://localhost:3000/docs/api-docs`);
  console.log(`   http://localhost:3000/docs/platform-docs\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });