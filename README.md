# HelpPages - Documentation Platform

A modern, multi-tenant documentation platform built with Next.js 14, featuring subdomain-based CMS, hierarchical navigation, version control, and comprehensive content management.

## 🎯 What is HelpPages?

HelpPages is a SaaS documentation platform that allows users to create and manage beautiful documentation sites. Each user gets their own subdomain (e.g., `username.helppages.ai`) where they can access their CMS and publish documentation.

### Key Features

- **Subdomain-Based CMS**: Each user gets a unique subdomain for their documentation
- **Hierarchical Navigation**: Dropdowns → Items → Sections → Pages structure
- **Content Management**: Create, edit, and organize documentation pages
- **Version Control**: Track changes and restore previous versions
- **Search**: Global search across all documentation
- **User Roles**: Admin, Editor, and Viewer roles with granular permissions
- **Public/Private Docs**: Control visibility of your documentation
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop
- **Dark Mode**: Automatic theme switching based on system preferences

## 🏗️ Architecture Overview

### Subdomain System

The platform uses a subdomain-based architecture:

- **Main Domain** (`helppages.ai`): Landing page, signup, and login
- **User Subdomains** (`username.helppages.ai`): Each user's personal CMS and documentation

When a user signs up:

1. They choose a username
2. Their subdomain is automatically created: `username.helppages.ai`
3. They can access their CMS at `https://username.helppages.ai/cms`
4. Their public docs are available at `https://username.helppages.ai/docs`

### Navigation Structure

The documentation uses a hierarchical structure:

```
Dropdown (e.g., "Products")
  └── Item (e.g., "Database")
      ├── Pages (directly in item)
      └── Sections
          ├── Pages (in section)
          └── Subsections
              └── Pages (in subsection)
```

### Database Schema

- **Users**: Authentication and user profiles
- **Docs**: Documentation projects
- **NavHeaders**: Dropdown menus and sections
- **DocItems**: Items within dropdowns
- **Pages**: Individual documentation pages
- **PageRevisions**: Version history

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository:**

```bash
git clone <repository-url>
cd superbase-docs
```

2. **Install dependencies:**

```bash
npm install
```

3. **Set up environment variables:**

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/helppages"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here-generate-a-random-string"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Custom domain
NEXT_PUBLIC_DOMAIN="helppages.ai"
```

4. **Set up the database:**

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed with sample data
npm run seed
```

5. **Start the development server:**

```bash
npm run dev
```

6. **Access the application:**

- Main site: http://localhost:3000
- CMS Dashboard: http://localhost:3000/cms (after login)

## 📖 How to Use

### For End Users

1. **Sign Up**: Create an account at the main domain
2. **Access Your CMS**: You'll be redirected to your subdomain CMS
3. **Create Documentation**:
   - Create a new documentation project
   - Add dropdowns (e.g., "Products", "Guides")
   - Add items to dropdowns (e.g., "Database", "Auth")
   - Create pages and sections
4. **Publish**: Make your docs public to share with others

### For Developers

#### Project Structure

```
superbase-docs/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/        # Authentication endpoints
│   │   ├── docs/        # Documentation CRUD
│   │   ├── pages/       # Page management
│   │   ├── nav-headers/ # Navigation management
│   │   └── doc-items/   # Item management
│   ├── auth/            # Authentication pages
│   │   ├── login/       # Login page
│   │   └── signup/      # Signup page
│   ├── cms/             # CMS dashboard
│   │   ├── docs/        # Documentation management
│   │   ├── pages/       # Page editor
│   │   └── settings/    # User settings
│   ├── docs/            # Public documentation viewer
│   │   └── [slug]/      # Individual doc pages
│   ├── components/      # Reusable components
│   └── globals.css      # Global styles
├── lib/
│   ├── auth.ts          # Authentication utilities
│   ├── subdomain.ts     # Subdomain detection
│   ├── prisma.ts        # Prisma client
│   └── slug.ts          # Slug generation
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seeding
├── middleware.ts        # Subdomain routing
└── README.md            # This file
```

#### Key Components

- **Subdomain Detection**: `lib/subdomain.ts` - Detects and handles subdomain routing
- **Authentication**: `lib/auth.ts` - User authentication and profile management
- **CMS Dashboard**: `app/cms/` - Content management interface
- **Public Docs**: `app/docs/` - Public-facing documentation viewer

#### API Endpoints

**Authentication:**

- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

**Documentation:**

- `GET /api/docs` - List user's documentation projects
- `POST /api/docs` - Create new documentation
- `GET /api/docs/[id]` - Get documentation details
- `PUT /api/docs/[id]` - Update documentation
- `DELETE /api/docs/[id]` - Delete documentation

**Navigation:**

- `GET /api/nav-headers?docId=...` - Get dropdowns/sections
- `POST /api/nav-headers` - Create dropdown/section
- `GET /api/doc-items?navHeaderId=...` - Get items in dropdown
- `POST /api/doc-items` - Create item

**Pages:**

- `GET /api/pages?docId=...&docItemId=...` - Get pages
- `POST /api/pages` - Create page
- `GET /api/pages/[id]` - Get page details
- `PUT /api/pages/[id]` - Update page
- `DELETE /api/pages/[id]` - Delete page

## 🔧 Configuration

### Subdomain Setup

For production, you need to configure wildcard subdomain DNS and web server:

1. **DNS Configuration**: Add a wildcard A record:

   - `*.helppages.ai` → Your server IP

2. **Server Configuration**: Configure your web server (Nginx/Apache) to handle wildcard subdomains:

   - Set up wildcard SSL certificate (`*.helppages.ai`)
   - Configure server to accept all subdomains
   - Proxy requests to your Next.js application (default port 3000)
   - Ensure the `Host` header is passed correctly to Next.js

3. **Environment Variables**: Set `NEXT_PUBLIC_DOMAIN` to your domain

**Note**: The application handles subdomain routing automatically via `middleware.ts`. You just need to ensure your web server proxies all subdomain requests to the Next.js app.

### Database

The application uses PostgreSQL with Prisma ORM. Key models:

- **User**: User accounts and authentication
- **Doc**: Documentation projects
- **NavHeader**: Navigation dropdowns and sections
- **DocItem**: Items within dropdowns
- **Page**: Individual documentation pages

## 🎨 Styling

The platform uses Tailwind CSS with a Supabase-inspired design:

- **Primary Color**: #3ECF8E (Supabase green)
- **Dark Mode**: Automatic based on system preference
- **Responsive**: Mobile-first design approach

## 🔐 Security

- **Authentication**: NextAuth.js with secure session management
- **Authorization**: Role-based access control (Admin, Editor, Viewer)
- **Subdomain Validation**: Users can only access their own subdomain
- **SQL Injection Protection**: Prisma ORM prevents SQL injection
- **XSS Protection**: React automatically escapes content

## 🚢 Deployment

### Production Checklist

1. **Database**: Set up PostgreSQL database
2. **Environment Variables**: Configure all required env vars
3. **DNS**: Set up wildcard subdomain DNS
4. **Server**: Configure web server for subdomain routing
5. **SSL**: Set up SSL certificates for all subdomains
6. **Migrations**: Run `npx prisma migrate deploy`

### Recommended Platforms

- **Vercel**: Easy deployment with Next.js
- **Railway**: Simple database and hosting
- **DigitalOcean**: Full control with App Platform
- **AWS/GCP**: Enterprise-grade hosting

## 📝 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Database
npx prisma generate  # Generate Prisma Client
npx prisma migrate dev  # Run migrations
npm run seed         # Seed database

# Code Quality
npm run lint         # Run ESLint
```

### Adding New Features

1. **Database Changes**: Update `prisma/schema.prisma` and run migrations
2. **API Routes**: Add routes in `app/api/`
3. **Components**: Create reusable components in `app/components/`
4. **Pages**: Add pages in `app/` directory

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use for personal and commercial projects.

## 🆘 Support

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Questions**: Check the code comments and inline documentation

## 🎉 Acknowledgments

- **Supabase** - Design inspiration
- **Next.js** - Amazing framework
- **Prisma** - Excellent ORM
- **Tailwind CSS** - Utility-first CSS

---

**Built with ❤️ for the documentation community**
