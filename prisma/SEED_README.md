# Database Seeder

This script clears the database and seeds it with sample data for testing and development.

## Usage

Run the seeder script:

```bash
npm run seed
```

## What it does

1. **Clears all data** from the database (in the correct order to respect foreign key constraints)
2. **Creates sample users**:
   - Admin user: `admin@example.com` / `password123`
   - Editor user: `editor@example.com` / `password123`
3. **Creates sample documentation**:
   - API Documentation (slug: `api-docs`)
   - Getting Started Guide (slug: `getting-started`)
4. **Creates sample pages** with markdown content including sections (h2) and subsections (h3):
   - Database Overview
   - Authentication
   - Storage
   - Quick Start
   - Core Concepts

## Sample URLs

After seeding, you can visit:
- API Docs: `http://localhost:3000/docs/api-docs`
- Getting Started: `http://localhost:3000/docs/getting-started`

## Login Credentials

- **Admin**: admin@example.com / password123
- **Editor**: editor@example.com / password123

