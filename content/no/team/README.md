# Adding Team Members

## How to add a new team member:

1. **Create a markdown file** in `content/team/` named `firstname-lastname.md`

2. **Use this template**:
```markdown
---
name: "Full Name"
position: "Job Title"
email: "email@anteo.no"
phone: "+47 XXX XX XXX"
linkedin: "https://linkedin.com/in/username"
photo: "/assets/images/team/firstname-lastname.jpg"
order: 10
---

Brief bio or description of the person's role and expertise at Anteo.
```

3. **Add their photo** to `src/assets/images/team/`
   - Name it `firstname-lastname.jpg`
   - Recommended size: 400x400px
   - Square format works best

4. **Set the order** number to control display order (lower numbers appear first)

## To get real employee data from anteo.no:

1. Visit https://www.anteo.no/om-oss
2. Find the "Våre ansatte" section
3. For each employee:
   - Download their photo
   - Copy their name, title, and bio
   - Create a markdown file with their information

## Example:
```markdown
---
name: "Kari Nordmann"
position: "Daglig leder"
email: "kari@anteo.no"
phone: "+47 123 45 678"
linkedin: "https://linkedin.com/in/karinordmann"
photo: "/assets/images/team/kari-nordmann.jpg"
order: 1
---

Kari har over 20 års erfaring fra havbruksnæringen og har ledet Anteo siden 2015.
```
