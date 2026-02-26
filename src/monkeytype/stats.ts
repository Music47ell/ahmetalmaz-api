export interface MonkeyTypeStats {
  bestRecord: {
    wpm: number
    accuracy: number
    rawWpm: number
    consistency: number
    timestamp: number
  }
  totalTests: number
  totalTimeTyping: number // in seconds
  totalWords: number
  accountAge: number // in milliseconds
}

export const getMonkeyTypeStats = async (): Promise<MonkeyTypeStats> => {
  const apiKey = process.env.MONKEYTYPE_API_KEY
  const username = process.env.MONKEYTYPE_USERNAME
  
  if (!apiKey) {
    throw new Error("MONKEYTYPE_API_KEY environment variable is not set")
  }

  if (!username) {
    throw new Error("MONKEYTYPE_USERNAME environment variable is not set")
  }

  try {
    // Fetch user profile - contains all data we need
    const profileRes = await fetch(
      `https://api.monkeytype.com/users/${username}/profile?isUid=false`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApeKey ${apiKey}`,
        },
      }
    )

    if (!profileRes.ok) {
      throw new Error(`Failed to fetch MonkeyType profile: ${profileRes.status}`)
    }

    const profileData = await profileRes.json()
    const user = profileData.data

    // Get typing stats from profile
    const typingStats = user.typingStats || {}
    const accountAge = new Date().getTime() - (user.addedAt || 0)

    // Get best record from personalBests
    let bestRecord = {
      wpm: 0,
      accuracy: 0,
      rawWpm: 0,
      consistency: 0,
      timestamp: 0,
    }

    // Check all PB categories (time and words modes)
    const allPbs: any[] = []
    
    if (user.personalBests?.time) {
      Object.values(user.personalBests.time).forEach((timeMode: any) => {
        if (Array.isArray(timeMode)) {
          allPbs.push(...timeMode)
        }
      })
    }

    if (user.personalBests?.words) {
      Object.values(user.personalBests.words).forEach((wordsMode: any) => {
        if (Array.isArray(wordsMode)) {
          allPbs.push(...wordsMode)
        }
      })
    }

    // Find best record (highest WPM)
    if (allPbs.length > 0) {
      const bestResult = allPbs.reduce((prev: any, current: any) => {
        return (current.wpm || 0) > (prev.wpm || 0) ? current : prev
      })

      bestRecord = {
        wpm: Math.round(bestResult.wpm * 100) / 100 || 0,
        accuracy: Math.round(bestResult.acc * 100) / 100 || 0,
        rawWpm: Math.round(bestResult.raw * 100) / 100 || 0,
        consistency: Math.round(bestResult.consistency * 100) / 100 || 0,
        timestamp: bestResult.timestamp || 0,
      }
    }

    // Fetch all results to calculate true total words
    let totalWords = 0
    
    const resultsRes = await fetch(
      `https://api.monkeytype.com/results?limit=1000`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApeKey ${apiKey}`,
        },
      }
    )

    if (resultsRes.ok) {
      const resultsData = await resultsRes.json()
      const results = resultsData.data || []
      
      results.forEach((result: any) => {
        // charStats[0] = correct characters
        // 1 word = 5 characters (MonkeyType standard)
        const correctChars = result.charStats?.[0] || 0
        totalWords += Math.round(correctChars / 5)
      })
    } else {
      console.warn(`Failed to fetch MonkeyType results: ${resultsRes.status}`)
    }

    return {
      bestRecord,
      totalTests: typingStats.completedTests || 0,
      totalTimeTyping: typingStats.timeTyping || 0, // in seconds
      totalWords,
      accountAge, // in milliseconds
    }
  } catch (error) {
    console.error('Error fetching MonkeyType stats:', error)
    throw error
  }
}