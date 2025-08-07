## Diagnosis: Why Claude Code Can't See Your Agents

After researching, here's what's happening:

### The Problem:
Your agents from `claude-code-subagents/` are in an **older format** that Claude Code doesn't recognize anymore. Claude Code expects agents to be created through its `/agents` command interface, not just as markdown files.

### Key Differences:

#### Your Current Agent Format (OLD):
```yaml
---
name: backend-reliability-engineer
description: |
  Use this agent when...
color: yellow
---
```

#### What Claude Code Expects (NEW):
```yaml
---
name: backend-reliability-engineer
description: Short, focused description
tools: Read, Write, Bash, etc  # Must specify tools
---
```

### The Solution:

You have three options:

## Option 1: Use Claude Code's Built-in Agent Creator (RECOMMENDED)

1. Type `/agents` in Claude Code
2. Click "Create new agent"
3. Choose "Generate with Claude"
4. Enter a prompt like: "Create a backend reliability engineer agent for auditing Supabase connections and API reliability"
5. Claude will generate the agent in the correct format

## Option 2: Convert Your Existing Agents

Convert each agent to the new format:

```bash
# Example conversion script
cat > /Applications/fortress-modeler-cloud/.claude/agents/backend-reliability.md << 'EOF'
---
name: backend-reliability
description: Audits backend systems, APIs, databases, and Supabase connections for reliability and security issues
tools: Read, Write, Bash, Search, List, Edit
---

You are a Backend Reliability Engineer focused on:
- Supabase connection issues and authentication problems
- API reliability and error handling
- Database query optimization
- Security vulnerabilities
- Performance bottlenecks

When auditing, you:
1. Check all configuration files for mismatches
2. Verify environment variables are consistent
3. Test API endpoints for proper error handling
4. Review authentication flows for security issues
5. Identify and document all problems with severity levels
EOF
```

## Option 3: Quick Fix - Create Essential Agents Now

Let me create the most important agents for your audit in the correct format:
