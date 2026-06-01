import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { IncomingMessage } from 'node:http'

const ROOT = dirname(fileURLToPath(import.meta.url))
const PROMPT_PATH = resolve(ROOT, 'claude/EXTRACT_PROMPT.md')
const CLAUDE_TIMEOUT_MS = 120_000

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** Pull the first balanced-looking JSON object out of CLI output. */
function extractJson(out: string): string {
  let s = out.trim()
  // Strip ``` / ```json fences if the model added them anyway.
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('Claude did not return a JSON object.')
  }
  return s.slice(start, end + 1)
}

/** Run the resume text through the Claude Code CLI in headless print mode. */
function runClaude(resumeText: string): Promise<string> {
  const prompt = readFileSync(PROMPT_PATH, 'utf8')
  const input = `${prompt}\n${resumeText}\n`
  // A short, shell-safe instruction; the real prompt + resume go via stdin.
  const instruction =
    'Read the entire piped input and produce exactly the JSON it asks for. ' +
    'Respond with raw JSON only.'

  return new Promise((resolveRun, reject) => {
    const child = spawn(`claude -p "${instruction}" --output-format text`, {
      shell: true,
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('Claude CLI timed out.'))
    }, CLAUDE_TIMEOUT_MS)

    child.stdout.on('data', (d) => (stdout += d))
    child.stderr.on('data', (d) => (stderr += d))
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(new Error(`Could not launch the Claude CLI: ${e.message}`))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Claude CLI exited with code ${code}.`))
        return
      }
      try {
        resolveRun(extractJson(stdout))
      } catch (e) {
        reject(e as Error)
      }
    })

    child.stdin.write(input)
    child.stdin.end()
  })
}

/** Dev-only bridge: POST /api/claude { text } -> CareerProfile JSON. */
function claudeBridge(): Plugin {
  return {
    name: 'resume-enh-claude-bridge',
    configureServer(server) {
      server.middlewares.use('/api/claude', (req, res) => {
        void (async () => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method Not Allowed')
            return
          }
          res.setHeader('Content-Type', 'application/json')
          try {
            const { text } = JSON.parse((await readBody(req)) || '{}')
            if (typeof text !== 'string' || text.trim().length === 0) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Expected a non-empty "text" field.' }))
              return
            }
            const json = await runClaude(text)
            res.statusCode = 200
            res.end(json)
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: (e as Error).message }))
          }
        })()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), claudeBridge()],
})
