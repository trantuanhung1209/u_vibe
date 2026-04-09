# Documentation Index

Welcome to the Uside Vibe documentation! This folder contains comprehensive technical documentation for the project.

---

## 📚 Documentation Files

### [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md)
**Entity Relationship Diagram & Database Schema**

Complete documentation of the PostgreSQL database structure:
- ERD diagram (Mermaid)
- Table descriptions with all columns
- Relationships and foreign keys
- Sample queries
- Migration history
- Indexes and constraints

**Use this when:**
- Understanding data model
- Writing database queries
- Planning schema changes
- Debugging data issues

---

### [API-SPEC.md](./API-SPEC.md)
**API Specification & Endpoints**

Comprehensive API documentation for tRPC and REST endpoints:
- tRPC router structure
- All query and mutation endpoints
- Request/response schemas
- Authentication requirements
- Error codes
- Usage examples (TypeScript, React, cURL)

**Use this when:**
- Integrating with the API
- Understanding available endpoints
- Debugging API calls
- Writing client code

---

### [ARCHITECTURE.md](./ARCHITECTURE.md)
**System Architecture & Design**

High-level and detailed architecture documentation:
- Component diagrams
- Data flow sequences
- Technology stack breakdown
- Module organization
- Deployment architecture
- Security layers
- Scaling considerations

**Use this when:**
- Understanding system design
- Making architectural decisions
- Onboarding new developers
- Planning infrastructure changes

---

### [SEO-SETUP.md](./SEO-SETUP.md) *(if exists)*
**SEO Implementation Guide**

Documentation for SEO best practices:
- Metadata configuration
- Open Graph tags
- Twitter Cards
- Sitemap setup
- Structured data (JSON-LD)

---

## 📁 Sprint Reports

### [sprints/SPRINT-01.md](./sprints/SPRINT-01.md)
**Sprint 1: Project Foundation & Setup**

Week 1-2 (Jan 1-14, 2026)
- Initial project setup
- Database configuration
- Authentication (Clerk)
- tRPC setup
- Core infrastructure

---

### [sprints/SPRINT-02.md](./sprints/SPRINT-02.md)
**Sprint 2: Core Features - Projects & E2B Integration**

Week 3-4 (Jan 15-28, 2026)
- Project management
- Message system
- E2B sandbox integration
- Inngest background jobs
- Basic UI/UX

---

### [sprints/SPRINT-03.md](./sprints/SPRINT-03.md)
**Sprint 3: AI Agent & Image-to-Code Feature**

Week 5-6 (Jan 29 - Feb 11, 2026)
- OpenAI integration
- AI agent with tools
- Image upload feature
- Vision API integration
- Usage tracking system

---

### [sprints/SPRINT-04.md](./sprints/SPRINT-04.md) *(planned)*
**Sprint 4: Polish & Production Readiness**

Week 7-8 (Feb 12-25, 2026)
- SEO optimization
- Performance improvements
- Documentation completion
- Production deployment
- Final testing

---

## 🎯 Quick Reference

### For Developers

**Getting started:**
1. Read [../README.md](../README.md) for setup instructions
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview
3. Check [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md) for data model
4. Refer to [API-SPEC.md](./API-SPEC.md) for API usage

**When building features:**
1. Check sprint reports for context
2. Review architecture diagrams
3. Follow API patterns
4. Update documentation as you go

---

### For Stakeholders

**Project status:**
- Sprint reports show weekly progress
- Architecture docs explain technical decisions
- Database schema shows data structure

**Understanding the system:**
1. Start with [ARCHITECTURE.md](./ARCHITECTURE.md) diagrams
2. Review latest sprint report for current status
3. Check [../README.md](../README.md) for feature overview

---

## 🔄 Maintenance

### Updating Documentation

**When to update:**
- ✅ After schema changes → Update DATABASE-SCHEMA.md
- ✅ After adding APIs → Update API-SPEC.md
- ✅ After architecture changes → Update ARCHITECTURE.md
- ✅ End of each sprint → Create new sprint report
- ✅ After major features → Update README.md

**Documentation standards:**
- Use Mermaid for diagrams
- Include code examples
- Add timestamps for changes
- Link between related docs
- Keep examples up-to-date

---

## 📝 Contributing to Docs

### Format Guidelines

**Markdown:**
```markdown
# Main Heading (H1) - Only one per file

## Section Heading (H2)

### Subsection Heading (H3)

- Bullet points for lists
- Use `code` for inline code
- Use ```language for code blocks
```

**Code Examples:**
- Always specify language
- Include necessary imports
- Show complete, working examples
- Add comments for clarity

**Diagrams:**
- Use Mermaid for sequence/flow diagrams
- Use ASCII art for simple layouts
- Include legend if needed

---

## 🔗 External Resources

### Official Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [tRPC Docs](https://trpc.io/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [E2B Docs](https://e2b.dev/docs)
- [Inngest Docs](https://www.inngest.com/docs)
- [Clerk Docs](https://clerk.com/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)

### Tools
- [Mermaid Live Editor](https://mermaid.live)
- [Prisma Studio](https://www.prisma.io/studio)
- [Inngest Dashboard](https://app.inngest.com)

---

## 📊 Documentation Health

| Document | Last Updated | Status |
|----------|-------------|--------|
| README.md | Jan 20, 2026 | ✅ Current |
| DATABASE-SCHEMA.md | Jan 20, 2026 | ✅ Current |
| API-SPEC.md | Jan 20, 2026 | ✅ Current |
| ARCHITECTURE.md | Jan 20, 2026 | ✅ Current |
| SPRINT-01.md | Jan 14, 2026 | ✅ Final |
| SPRINT-02.md | Jan 28, 2026 | ✅ Final |
| SPRINT-03.md | Feb 11, 2026 | ✅ Final |

---

## 🆘 Need Help?

**Can't find what you're looking for?**
1. Check the table of contents above
2. Search within files (Ctrl/Cmd + F)
3. Review sprint reports for historical context
4. Check git commit messages
5. Ask the team!

**Found an error or outdated info?**
1. Create an issue on GitHub
2. Submit a pull request with corrections
3. Notify the maintainer

---

**Last Updated:** January 20, 2026  
**Maintained By:** [@trantuanhung1209](https://github.com/trantuanhung1209)
