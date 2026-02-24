# generate-cover-letter

## Purpose
Generate AI-powered cover letters for specific job postings using Gemini AI, combining job details with your profile to create tailored application materials.

## Access Method
**Node.js Module Import** + Gemini AI API

Primary module: `/workspace/extra/job-scout/src/coverLetter.js`

This module integrates job data with your profile and calls Gemini AI to generate a cover letter.

## Common Tasks

### Task 1: Generate Cover Letter for Specific Job
**Required:** Job ID or job details (title, company)
**Example queries:**
- "Generate cover letter for the Adobe job"
- "Write cover letter for job ID job-12345"
- "Create cover letter for that Senior Designer role"

**Access pattern:**
```javascript
// Import cover letter generator
const { generateCoverLetter } = require('/workspace/extra/job-scout/src/coverLetter.js');

// Load job data
const jobData = require('/workspace/extra/job-scout/data/jobs/scored/job-12345.json');

// Load user profile
const profile = require('/workspace/extra/job-scout/config/profile.json');

// Generate cover letter
const coverLetter = await generateCoverLetter(jobData, profile);
```

**Telegram Output Format:**
```
✍️ Cover Letter Generated - Adobe Senior Product Designer

[First paragraph of cover letter...]

[Second paragraph...]

[Closing paragraph...]

(Full cover letter is ~400 words. Say "email this" to send, or "revise" to regenerate)
```

**Note:** Cover letters will likely exceed Telegram's message length for a single cohesive view. Consider:
- Showing just first paragraph + summary
- Offering to email the full version
- Saving to a file and providing download link

### Task 2: Generate Cover Letter with Custom Focus
**Purpose:** Emphasize specific skills or experiences
**Example queries:**
- "Generate cover letter focusing on my design system work"
- "Write cover letter emphasizing remote experience"
- "Create cover letter highlighting leadership"

**Access pattern:**
```javascript
const coverLetter = await generateCoverLetter(jobData, profile, {
  focus: 'design systems',
  tone: 'professional',
  emphasis: ['remote work', 'cross-functional collaboration']
});
```

**Telegram Output Format:**
```
✍️ Custom Cover Letter (Design Systems Focus)

Dear Hiring Manager at Adobe,

[Paragraph emphasizing design system expertise...]

[Rest of letter...]
```

### Task 3: Regenerate/Revise Cover Letter
**Purpose:** Get a different version of the cover letter
**Example queries:**
- "Revise that cover letter"
- "Try again, make it more enthusiastic"
- "Regenerate with different tone"

**Access pattern:**
```javascript
// Same call but with different parameters or seed
const revisedLetter = await generateCoverLetter(jobData, profile, {
  tone: 'enthusiastic',
  regenerate: true
});
```

**Telegram Output Format:**
```
✍️ Revised Cover Letter (Enthusiastic Tone)

Dear Adobe Team,

[More enthusiastic opening...]
```

### Task 4: Batch Generate for Multiple Jobs
**Purpose:** Create cover letters for several high-scoring jobs at once
**Example queries:**
- "Generate cover letters for all high-scoring jobs"
- "Create cover letters for top 3 jobs"

**Access pattern:**
```javascript
const highScoringJobs = getJobsByTier('high'); // 85+
const letters = await Promise.all(
  highScoringJobs.slice(0, 3).map(job =>
    generateCoverLetter(job, profile)
  )
);
```

**Telegram Output Format:**
```
✍️ Generated 3 Cover Letters

1. Adobe - Senior Product Designer
   Preview: "Dear Hiring Manager at Adobe, I am writing to express..."

2. Shopify - Design Lead
   Preview: "Dear Shopify Team, With over 8 years of product design..."

3. Google - UX Designer
   Preview: "Dear Google Hiring Team, I was excited to see..."

(Say "show #1" to see full letter, or "email all" to send)
```

### Task 5: Save Cover Letter to File
**Purpose:** Export cover letter for editing or submission
**Example queries:**
- "Save that cover letter to a file"
- "Export the Adobe cover letter"
- "Write cover letter to disk"

**Access pattern:**
```javascript
const fs = require('fs');
const filename = `/workspace/extra/job-scout/output/cover-letter-${jobData.company}-${Date.now()}.txt`;
fs.writeFileSync(filename, coverLetter);
```

**Telegram Output Format:**
```
💾 Cover Letter Saved

File: cover-letter-Adobe-1705334400000.txt
Location: /workspace/extra/job-scout/output/

Ready to copy/paste or attach to application.
```

## Profile Data Structure
The cover letter generator uses your profile data:
```json
{
  "name": "Your Name",
  "email": "you@example.com",
  "phone": "+1234567890",
  "location": "Toronto, ON",
  "experience": [
    {
      "title": "Senior Product Designer",
      "company": "Previous Company",
      "duration": "2020-2024",
      "highlights": [
        "Led design system overhaul",
        "Managed team of 4 designers"
      ]
    }
  ],
  "skills": [
    "Figma",
    "Design Systems",
    "User Research",
    "Prototyping"
  ],
  "education": [
    {
      "degree": "BFA Design",
      "school": "University Name",
      "year": 2018
    }
  ],
  "portfolio": "https://yourportfolio.com"
}
```

## Gemini AI Integration

The cover letter generator uses Gemini AI with this prompt structure:
```
You are a professional cover letter writer. Generate a compelling cover letter for:

Job: {jobData.title} at {jobData.company}
Location: {jobData.location}
Salary: {jobData.salary}

Candidate Profile:
{profile summary}

Requirements:
- Professional yet warm tone
- 3-4 paragraphs
- Highlight relevant experience
- Show enthusiasm for role
- Include specific examples
- Close with call to action

Generate the cover letter:
```

## Important Notes

### Message Length Handling
Cover letters are typically 300-500 words, which may approach Telegram's 4096 character limit. Strategies:
1. **Preview mode:** Show first paragraph + "Say 'show full' for complete letter"
2. **File export:** Always offer to save to file
3. **Email integration:** Offer to email the cover letter
4. **Chunking:** If showing full text, it will auto-chunk via Telegram's message splitting

### Quality Control
- Always include job title and company in the letter
- Verify profile data is loaded correctly
- Check for generic placeholders in output
- Ensure letter is addressed to correct company
- Validate Gemini API response before showing to user

### Error Handling
- Profile missing: "Profile data not found. Update /workspace/extra/job-scout/config/profile.json"
- Job not found: "Could not find job details for that ID"
- Gemini API error: "AI service unavailable, try again later"
- Invalid job data: "Job data is incomplete, cannot generate cover letter"

## Advanced Features

### Tone Options
```javascript
tones = ['professional', 'enthusiastic', 'conversational', 'formal']
```

### Custom Sections
```javascript
sections = ['intro', 'experience', 'skills', 'enthusiasm', 'closing']
// User can request to emphasize or skip sections
```

### Template Selection
```javascript
templates = ['standard', 'creative', 'technical', 'executive']
// Different templates for different job types
```

## Integration Notes

### With check-jobs
When user views a job via `check-jobs` and says "generate cover letter":
1. Identify which job they're referring to (from context)
2. Load that job's JSON file
3. Generate cover letter automatically
4. Offer to save or email

### With adjust-scoring
Profile updates should trigger:
1. Offer to regenerate existing cover letters
2. Mention that future letters will use updated profile

### File Management
Store generated letters with naming convention:
```
cover-letter-{company}-{job-id}-{timestamp}.txt
```

Keep last 10 letters, delete older ones to save space.
