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
  await prisma.navHeader.deleteMany();
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

  const editor = await prisma.user.create({
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

  console.log(`✅ Created users: ${admin.username}, ${editor.username}\n`);

  // Create documentation
  console.log('📚 Creating documentation...');
  
  const apiDoc = await (prisma as any).doc.create({
    data: {
      userId: admin.id,
      title: 'API Documentation',
      slug: 'api-docs',
      description: 'Complete API reference and guides for developers',
      isPublic: true,
    },
  });

  const gettingStartedDoc = await (prisma as any).doc.create({
    data: {
      userId: admin.id,
      title: 'Getting Started Guide',
      slug: 'getting-started',
      description: 'Everything you need to know to get started',
      isPublic: true,
    },
  });

  console.log(`✅ Created docs: ${apiDoc.title}, ${gettingStartedDoc.title}\n`);

  // Create pages with markdown content (including sections and subsections)
  console.log('📄 Creating pages...');

  // Page 1: Database Overview with sections
  const dbOverviewPage = await (prisma as any).page.create({
    data: {
      docId: apiDoc.id,
      userId: admin.id,
      title: 'Database Overview',
      slug: 'database-overview',
      summary: 'Introduction to our database system and its features',
      content: `# Database Overview

Every project comes with a full **Postgres** database, a free and open source database which is considered one of the world's most stable and advanced databases.

## Features

### Table view

You don't have to be a database expert to start using our platform. Our table view makes Postgres as easy to use as a spreadsheet.

You can view, edit, and manage your data directly from the dashboard with an intuitive interface.

### Relationships

Define relationships between your tables easily. We support one-to-one, one-to-many, and many-to-many relationships.

#### Foreign Keys

Foreign keys help maintain referential integrity between tables. They ensure that relationships between data are consistent.

#### Cascading Deletes

When you delete a parent record, child records can be automatically deleted based on your cascade settings.

### Clone Tables

Quickly duplicate tables with all their structure, data, and relationships.

### The SQL Editor

Write and execute SQL queries directly in our SQL editor. Perfect for advanced users who need more control.

#### Running Queries

Click the SQL tab in any table view to open the SQL editor and start writing queries.

#### Query History

All your queries are saved in history so you can easily reuse them later.

### Additional Features

We provide many additional features to help you manage your database:

- Index management
- View management
- Function management
- Trigger management
- Webhook management

### Extensions

Extend your database with PostgreSQL extensions:

- PostGIS for geospatial data
- pg_trgm for fuzzy text matching
- uuid-ossp for UUID generation

## Terminology

### Database

The main database instance that contains all your tables, views, and other objects.

### Schema

A namespace that contains named objects like tables, views, and functions.

### Table

A collection of related data organized in rows and columns.

## Tips

- Always backup your data before making major changes
- Use transactions for critical operations
- Index frequently queried columns for better performance

## Next steps

- Learn about [Connecting to your database](/docs/api-docs/connecting)
- Check out [Importing data](/docs/api-docs/importing-data)
- Read about [Securing your data](/docs/api-docs/securing-data)
`,
      status: 'published',
      position: 0,
      publishedAt: new Date(),
    },
  });

  // Page 2: Authentication
  const authPage = await (prisma as any).page.create({
    data: {
      docId: apiDoc.id,
      userId: admin.id,
      title: 'Authentication',
      slug: 'authentication',
      summary: 'Learn how to implement authentication in your applications',
      content: `# Authentication

Our platform provides a complete authentication solution that's secure, flexible, and easy to implement.

## Getting Started

### Setup

First, you need to enable authentication in your project settings.

### Configuration

Configure your authentication providers in the dashboard.

## Providers

### Email/Password

The simplest authentication method. Users can sign up and sign in with their email and password.

#### Sign Up

Users can create an account by providing their email and password.

#### Sign In

Existing users can sign in with their credentials.

### OAuth Providers

We support multiple OAuth providers:

- Google
- GitHub
- Apple
- Twitter

#### Google OAuth

Connect your Google account for easy sign-in.

#### GitHub OAuth

Perfect for developer-focused applications.

## Security

### Password Policies

Configure password requirements to ensure strong passwords.

### Session Management

Control how long sessions last and when they expire.

### Multi-Factor Authentication

Add an extra layer of security with MFA.

## User Management

### User Profiles

Users can manage their profiles and settings.

### Roles and Permissions

Assign roles to users and control what they can access.
`,
      status: 'published',
      position: 1,
      publishedAt: new Date(),
    },
  });

  // Page 3: Storage
  const storagePage = await (prisma as any).page.create({
    data: {
      docId: apiDoc.id,
      userId: admin.id,
      title: 'Storage',
      slug: 'storage',
      summary: 'Manage file uploads and storage in your applications',
      content: `# Storage

Store and serve files of any size with our storage solution.

## Overview

Our storage system is built on top of S3-compatible storage, providing reliable and scalable file storage.

## Features

### File Uploads

Upload files directly from your application or through the dashboard.

#### Direct Uploads

Upload files directly to storage from your client application.

#### Server-Side Uploads

Upload files through your server for additional control.

### File Management

Organize your files into buckets and folders.

### Access Control

Control who can access your files with fine-grained permissions.

## Buckets

### Creating Buckets

Create buckets to organize your files.

### Bucket Policies

Set policies to control access to your buckets.

## File Operations

### Uploading Files

Learn how to upload files programmatically.

### Downloading Files

Retrieve files from storage.

### Deleting Files

Remove files when they're no longer needed.
`,
      status: 'published',
      position: 2,
      publishedAt: new Date(),
    },
  });

  // Getting Started Doc Pages
  const quickStartPage = await (prisma as any).page.create({
    data: {
      docId: gettingStartedDoc.id,
      userId: admin.id,
      title: 'Quick Start',
      slug: 'quick-start',
      summary: 'Get up and running in 5 minutes',
      content: `# Quick Start

Welcome! This guide will help you get started with our platform in just a few minutes.

## Installation

### Prerequisites

Before you begin, make sure you have:

- Node.js 18+ installed
- A code editor
- Basic knowledge of JavaScript

### Step 1: Create Account

First, create your account at [our platform](https://example.com/signup).

### Step 2: Create Project

Create a new project from the dashboard.

### Step 3: Install SDK

Install our JavaScript SDK:

\`\`\`bash
npm install @example/sdk
\`\`\`

## Configuration

### Initialize Client

Initialize the client in your application:

\`\`\`javascript
import { createClient } from '@example/sdk'

const client = createClient({
  url: 'https://your-project.example.com',
  anonKey: 'your-anon-key'
})
\`\`\`

## First Query

Let's make your first query:

\`\`\`javascript
const { data, error } = await client
  .from('users')
  .select('*')
\`\`\`

## Next Steps

- Read the [API Documentation](/docs/api-docs)
- Check out our [Examples](/docs/examples)
- Join our [Community](/community)
`,
      status: 'published',
      position: 0,
      publishedAt: new Date(),
    },
  });

  const conceptsPage = await (prisma as any).page.create({
    data: {
      docId: gettingStartedDoc.id,
      userId: admin.id,
      title: 'Core Concepts',
      slug: 'core-concepts',
      summary: 'Understanding the fundamental concepts',
      content: `# Core Concepts

Understanding these core concepts will help you build better applications.

## Projects

A project is your main workspace. Each project has its own database, authentication, and storage.

### Creating Projects

You can create multiple projects for different applications or environments.

### Project Settings

Configure your project settings including region, billing, and team members.

## Databases

Each project includes a PostgreSQL database.

### Tables

Tables store your data in rows and columns.

### Views

Views are virtual tables based on queries.

### Functions

Database functions allow you to run code on the database server.

## Authentication

Our authentication system handles user management.

### Users

Users are the accounts that can access your application.

### Sessions

Sessions track user authentication state.

## Storage

File storage for your application assets.

### Buckets

Buckets are containers for your files.

### Objects

Objects are the actual files stored in buckets.
`,
      status: 'published',
      position: 1,
      publishedAt: new Date(),
    },
  });

  console.log(`✅ Created ${5} pages\n`);

  console.log('🎉 Seeding completed successfully!\n');
  console.log('📝 Sample credentials:');
  console.log('   Admin: admin@example.com / password123');
  console.log('   Editor: editor@example.com / password123\n');
  console.log('🔗 Visit your docs at:');
  console.log(`   http://localhost:3000/docs/api-docs`);
  console.log(`   http://localhost:3000/docs/getting-started\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

