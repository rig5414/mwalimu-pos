const { execSync } = require('child_process')

try {
  console.log('Searching for processes on port 5173...')
  const output = execSync('netstat -ano | findstr :5173').toString().trim()
  if (output) {
    const lines = output.split('\n')
    const pids = new Set()
    for (const line of lines) {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && pid !== '0') {
        pids.add(pid)
      }
    }
    
    for (const pid of pids) {
      console.log(`Killing process with PID: ${pid}`)
      try {
        execSync(`taskkill /F /PID ${pid}`)
        console.log(`Successfully killed process ${pid}`)
      } catch (err) {
        console.error(`Failed to kill process ${pid}:`, err.message)
      }
    }
  } else {
    console.log('No processes found listening on port 5173.')
  }
} catch (e) {
  // If findstr returns no matches, netstat returns exit code 1
  console.log('No processes found on port 5173.')
}
