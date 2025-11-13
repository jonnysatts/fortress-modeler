#!/usr/bin/env node

import { OpenAI } from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize OpenAI with API key from environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to read file content
function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return null;
  }
}

// Main review function
async function performCodexReview() {
  console.log('🤖 Starting OpenAI Codex Review of Fortress Modeler Cloud Supabase Migration...\n');

  // Key files to review
  const filesToReview = [
    '../src/lib/supabase.ts',
    '../src/lib/database.types.ts', 
    '../src/services/implementations/SupabaseStorageService.ts',
    '../src/hooks/useSupabaseAuth.tsx',
    '../src/pages/Login.tsx',
    '../src/pages/AuthCallback.tsx',
    '../src/services/bootstrap.ts',
    '../supabase/migrations/001_enhanced_schema.sql'
  ];

  const codeContent = filesToReview.map(file => {
    const fullPath = path.resolve(__dirname, file);
    const content = readFileContent(fullPath);
    return content ? `// File: ${file}\n${content}\n\n` : `// File: ${file}\n// Could not read file\n\n`;
  }).join('');

  const prompt = `
You are OpenAI Codex, an expert code reviewer specializing in TypeScript, React, and Supabase integrations. 

Please perform a comprehensive code review of this Supabase migration implementation for Fortress Modeler Cloud. The migration converts from IndexedDB (Dexie) to Supabase with the following components:

REVIEW FOCUS AREAS:
1. **Code Quality & Best Practices**: TypeScript patterns, React hooks, error handling
2. **Supabase Integration**: Auth patterns, database queries, real-time setup
3. **Security**: Authentication flows, data validation, RLS policies  
4. **Performance**: Query optimization, caching strategies, bundle efficiency
5. **Architecture**: Service layer design, dependency injection, separation of concerns
6. **Testing Strategy**: Testability, mock points, coverage opportunities

CODEBASE CONTEXT:
- Financial modeling SaaS application
- Migration from DexieStorageService to SupabaseStorageService
- Google OAuth authentication with profile management
- Service layer abstraction with dependency injection
- TypeScript 100% coverage requirement

Please provide:
1. **Overall Assessment** (1-10 score with reasoning)
2. **Critical Issues** (must fix before production)
3. **Performance Optimizations** (specific recommendations)
4. **Security Considerations** (authentication, data access, validation)
5. **Code Quality Improvements** (patterns, structure, maintainability)
6. **Testing Recommendations** (coverage strategy, mock approaches)
7. **Production Readiness** (deployment considerations, monitoring)

Be specific with file names and line numbers where applicable. Focus on actionable recommendations.

CODE TO REVIEW:
${codeContent}
`;

  try {
    console.log('📊 Sending code to OpenAI Codex for analysis...\n');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system", 
          content: "You are OpenAI Codex, an expert code reviewer with deep knowledge of TypeScript, React, Supabase, and enterprise software architecture. Provide detailed, actionable code reviews."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.1,
    });

    const review = response.choices[0].message.content;
    
    // Save the review to a file
    const reviewPath = path.resolve(__dirname, '../OPENAI_CODEX_REVIEW.md');
    const reviewHeader = `# OpenAI Codex Code Review - Fortress Modeler Cloud Supabase Migration

**Review Date**: ${new Date().toISOString()}
**Model**: gpt-4-turbo-preview
**Reviewer**: OpenAI Codex
**Migration Status**: 85% Complete

---

`;

    fs.writeFileSync(reviewPath, reviewHeader + review);
    
    console.log('✅ OpenAI Codex review completed successfully!');
    console.log(`📄 Review saved to: ${reviewPath}`);
    console.log('\n📋 Review Summary:');
    console.log('=' .repeat(50));
    console.log(review.substring(0, 500) + '...');
    console.log('=' .repeat(50));
    console.log('\n💡 See full review in OPENAI_CODEX_REVIEW.md');

  } catch (error) {
    console.error('❌ Error during Codex review:', error.message);
    
    if (error.code === 'insufficient_quota') {
      console.log('💳 Insufficient OpenAI API quota. Please check your account.');
    } else if (error.code === 'invalid_api_key') {
      console.log('🔑 Invalid OpenAI API key. Please check your environment variables.');
    }
  }
}

// Run the review
performCodexReview().catch(console.error);