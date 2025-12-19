const { Telegraf, Markup } = require("telegraf")
const fs = require("fs")
const csv = require("csv-parser")

// Your Bot Token
const BOT_TOKEN = "8523853145:AAHq-VbhtgOJeCxjCPLalKfqwK-M-helyPA"

const userMessages = {} // Track all messages for deletion

// Neural Network-like scoring weights
const NEURAL_WEIGHTS = {
  age_exact: 45,
  age_close: 25,
  income_perfect: 40,
  income_close: 20,
  occupation_match: 35,
  interest_direct: 30,
  interest_related: 15,
  caste_match: 25,
  gender_specific: 20,
  disability_support: 30,
  family_size_large: 15,
  location_state: 20,
  location_all: 10,
  education_match: 18,
  urgency_high: 25,
  documents_ready: 12,
}

// Load CSV data
function loadSchemes() {
  return new Promise((resolve, reject) => {
    const schemes = []
    if (!fs.existsSync("updated_data.csv")) {
      console.log("CSV file not found! Using sample data...")
      resolve(getSampleSchemes())
      return
    }
    fs.createReadStream("updated_data.csv")
      .pipe(csv())
      .on("data", (row) => {
        schemes.push({
          name: row.scheme_name || row.Scheme_Name || row["Scheme Name"] || "Unknown Scheme",
          description: row.description || row.Description || "",
          eligibility: row.eligibility_criteria || row.Eligibility_Criteria || row["Eligibility Criteria"] || "",
          benefits: row.benefits || row.Benefits || "",
          apply: row.application_process || row["Application Process"] || "",
          link: row.official_link || row["Official Link"] || row.Link || "https://myscheme.gov.in",
          category: row.category || row.Category || "General",
          state: row.state || row.State || "All India",
          documents: row.documents_required || row.Documents || "",
          ministry: row.ministry || row.Ministry || "",
          deadline: row.deadline || row.Deadline || "",
          tags: row.tags || row.Tags || "",
        })
      })
      .on("end", () => {
        console.log(`✅ Loaded ${schemes.length} schemes from CSV.`)
        resolve(schemes)
      })
      .on("error", (err) => {
        console.error("❌ CSV Error:", err.message)
        resolve(getSampleSchemes())
      })
  })
}

function getSampleSchemes() {
  return [
    {
      name: "PM Awas Yojana",
      description: "Housing for all citizens with financial assistance for construction",
      eligibility: "Age: 18-60, Income <= 6, No pucca house, Rural/Urban",
      benefits: "Financial assistance up to ₹2.5 lakh for house construction, Subsidized home loans",
      apply: "Apply online at pmaymis.gov.in or visit CSC centers with required documents",
      link: "https://pmaymis.gov.in",
      category: "Housing",
      state: "All India",
      documents: "Aadhaar Card, Income Certificate, Bank Account Details, Property Documents",
      ministry: "Ministry of Housing and Urban Affairs",
      deadline: "Ongoing",
      tags: "housing,poor,family,construction,loan",
    },
    {
      name: "PM Kisan Samman Nidhi",
      description: "Direct income support for small and marginal farmers",
      eligibility: "Age: 18+, Farmers with cultivable land, Income <= 8, Landowners",
      benefits: "₹6000 per year in three equal installments of ₹2000 direct to bank account",
      apply: "Register at pmkisan.gov.in with land records or visit nearest CSC center",
      link: "https://pmkisan.gov.in",
      category: "Agriculture",
      state: "All India",
      documents: "Land Ownership Papers, Aadhaar Card, Bank Account, Mobile Number",
      ministry: "Ministry of Agriculture and Farmers Welfare",
      deadline: "Ongoing",
      tags: "farmer,agriculture,income,land,rural",
    },
    {
      name: "Ayushman Bharat PMJAY",
      description: "Free health insurance coverage for economically vulnerable families",
      eligibility: "Age: Any, Income <= 5, BPL families, SECC listed families",
      benefits: "Health insurance cover of ₹5 lakh per family per year, Cashless treatment",
      apply: "Visit nearest Ayushman Mitra at empanelled hospitals with family details",
      link: "https://pmjay.gov.in",
      category: "Health",
      state: "All India",
      documents: "Aadhaar Card, Ration Card, SECC Database Verification, Family ID",
      ministry: "Ministry of Health and Family Welfare",
      deadline: "Ongoing",
      tags: "health,insurance,hospital,medical,poor",
    },
    {
      name: "National Scholarship Portal",
      description: "Scholarships for students from SC/ST/OBC and economically weaker sections",
      eligibility: "Age: 16-25, Students, SC/ST/OBC/EWS, Income <= 8",
      benefits: "Scholarships from ₹10,000 to ₹1,00,000 per year based on course and merit",
      apply: "Apply online at scholarships.gov.in before deadline with academic documents",
      link: "https://scholarships.gov.in",
      category: "Education",
      state: "All India",
      documents: "Aadhaar, Caste Certificate, Income Certificate, Academic Marksheets, Bank Details",
      ministry: "Ministry of Education",
      deadline: "October 31 (Annual)",
      tags: "education,student,scholarship,sc,st,obc",
    },
    {
      name: "Pradhan Mantri Mudra Yojana",
      description: "Micro loans for small businesses and entrepreneurs without collateral",
      eligibility: "Age: 18+, Small business owners, Self-employed, Income any",
      benefits: "Loans up to ₹10 lakh without collateral for business expansion",
      apply: "Apply at any bank or NBFC with business plan and KYC documents",
      link: "https://mudra.org.in",
      category: "Employment",
      state: "All India",
      documents: "Aadhaar, Business Plan, Bank Statements, Address Proof, Income Proof",
      ministry: "Ministry of Finance",
      deadline: "Ongoing",
      tags: "business,loan,entrepreneur,self-employed,mudra",
    },
    {
      name: "Beti Bachao Beti Padhao",
      description: "Welfare scheme for girl child education and empowerment",
      eligibility: "Age: 0-21, Female, Any income, Girl child education focus",
      benefits: "Educational support, incentives, awareness programs for girl education",
      apply: "Enroll through schools, anganwadi centers, or district offices",
      link: "https://wcd.nic.in/bbbp-schemes",
      category: "Women",
      state: "All India",
      documents: "Birth Certificate, Aadhaar (if available), School Enrollment Proof",
      ministry: "Ministry of Women and Child Development",
      deadline: "Ongoing",
      tags: "women,girl,education,female,empowerment",
    },
  ]
}

let schemes = []
const userSessions = {}
const userHistory = {} // Store search history

function trackMessage(userId, messageId) {
  if (!userMessages[userId]) {
    userMessages[userId] = []
  }
  userMessages[userId].push(messageId)
}

async function deleteAllMessages(ctx, userId) {
  if (!userMessages[userId] || userMessages[userId].length === 0) {
    return
  }

  const messages = userMessages[userId]
  let deletedCount = 0

  // Delete messages but don't delete the last confirmation message
  for (const msgId of messages) {
    try {
      await ctx.telegram.deleteMessage(userId, msgId)
      deletedCount++
      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 50))
    } catch (error) {
      // Some messages might be too old or already deleted
      console.log(`Could not delete message ${msgId}`)
    }
  }

  // Clear the tracked messages
  userMessages[userId] = []
  console.log(`✅ Deleted ${deletedCount} messages for user ${userId}`)
}

// Advanced Neural Network-like Matching
function neuralMatchSchemes(userData) {
  if (schemes.length === 0) return []

  return schemes
    .map((scheme) => {
      let score = 0
      const elig = (scheme.eligibility || "").toLowerCase()
      const desc = (scheme.description || "").toLowerCase()
      const category = (scheme.category || "").toLowerCase()
      const tags = (scheme.tags || "").toLowerCase()

      // Layer 1: Age Analysis
      if (userData.age) {
        const ageMatch = elig.match(/(\d+)\s*[-to]+\s*(\d+)/i)
        if (ageMatch) {
          const min = Number.parseInt(ageMatch[1])
          const max = Number.parseInt(ageMatch[2])
          if (userData.age >= min && userData.age <= max) {
            score += NEURAL_WEIGHTS.age_exact
          } else if (userData.age >= min - 5 && userData.age <= max + 5) {
            score += NEURAL_WEIGHTS.age_close
          }
        } else if (elig.includes("any")) {
          score += NEURAL_WEIGHTS.age_close
        }
      }

      // Layer 2: Income Deep Analysis
      if (userData.income !== undefined) {
        const incomeMatch = elig.match(/<=?\s*(\d+(?:\.\d+)?)/i)
        if (incomeMatch) {
          const limit = Number.parseFloat(incomeMatch[1])
          if (userData.income <= limit) {
            score += NEURAL_WEIGHTS.income_perfect
          } else if (userData.income <= limit * 1.3) {
            score += NEURAL_WEIGHTS.income_close
          }
        } else if (elig.includes("any income")) {
          score += NEURAL_WEIGHTS.income_close
        }
      }

      // Layer 3: Occupation Intelligence
      if (userData.occupation) {
        const occLower = userData.occupation.toLowerCase()
        if (desc.includes(occLower) || elig.includes(occLower) || tags.includes(occLower)) {
          score += NEURAL_WEIGHTS.occupation_match
        }
      }

      // Layer 4: Interest Mapping
      if (userData.interest && userData.interest !== "all") {
        if (category.includes(userData.interest)) {
          score += NEURAL_WEIGHTS.interest_direct
        } else if (desc.includes(userData.interest) || tags.includes(userData.interest)) {
          score += NEURAL_WEIGHTS.interest_related
        }
      }

      // Layer 5: Social Category
      if (userData.caste && userData.caste !== "skip") {
        if (elig.includes(userData.caste.toLowerCase())) {
          score += NEURAL_WEIGHTS.caste_match
        }
      }

      // Layer 6: Gender-Specific
      if (userData.gender) {
        const genderLower = userData.gender.toLowerCase()
        if (
          elig.includes(genderLower) ||
          desc.includes(genderLower) ||
          (genderLower === "female" && (tags.includes("women") || tags.includes("girl")))
        ) {
          score += NEURAL_WEIGHTS.gender_specific
        }
      }

      // Layer 7: Disability Support
      if (userData.disability) {
        if (
          elig.includes("disability") ||
          desc.includes("disability") ||
          desc.includes("differently abled") ||
          tags.includes("disability")
        ) {
          score += NEURAL_WEIGHTS.disability_support
        }
      }

      // Layer 8: Family Size Factor
      if (userData.familySize >= 5) {
        if (elig.includes("family") || desc.includes("family") || tags.includes("family")) {
          score += NEURAL_WEIGHTS.family_size_large
        }
      }

      // Layer 9: Geographic Matching
      if (userData.location) {
        if (scheme.state === "All India") {
          score += NEURAL_WEIGHTS.location_all
        } else if (scheme.state.toLowerCase().includes(userData.location.toLowerCase())) {
          score += NEURAL_WEIGHTS.location_state
        }
      }

      // Layer 10: Education Level
      if (userData.education) {
        const eduLower = userData.education.toLowerCase()
        if (elig.includes(eduLower) || desc.includes(eduLower)) {
          score += NEURAL_WEIGHTS.education_match
        }
      }

      // Layer 11: Urgency Priority
      if (userData.urgency === "high") {
        if (scheme.deadline && scheme.deadline !== "Ongoing") {
          score += NEURAL_WEIGHTS.urgency_high
        }
      }

      // Layer 12: Document Readiness
      if (userData.hasDocuments) {
        const requiredDocs = (scheme.documents || "").toLowerCase()
        if (requiredDocs.includes("aadhaar") && userData.hasAadhaar) {
          score += NEURAL_WEIGHTS.documents_ready
        }
      }

      // Bonus: Multi-benefit schemes
      const benefitCount = (scheme.benefits.match(/₹|lakh|assistance|support/gi) || []).length
      score += Math.min(benefitCount * 3, 15)

      return { scheme, score }
    })
    .filter((x) => x.score > 25) // Neural threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => ({ ...x.scheme, matchScore: x.score }))
}

// AI Summarization
function aiSummarize(scheme, userProfile) {
  const lines = []

  // Personalized intro
  const age = userProfile.age
  if (age < 18) lines.push("🌟 Perfect for young individuals!")
  else if (age >= 18 && age < 30) lines.push("✨ Great opportunity for youth!")
  else if (age >= 30 && age < 60) lines.push("💼 Ideal for working professionals!")
  else lines.push("🙏 Excellent for senior citizens!")

  // Key benefit
  const benefitParts = scheme.benefits.split(".").filter((x) => x.trim())
  lines.push(`\n💰 **Main Benefit:** ${benefitParts[0]?.trim() || "Financial assistance"}`)

  // Why you match
  const matches = []
  if (userProfile.income && scheme.eligibility.match(/<=?\s*(\d+)/)) matches.push("✅ Income eligible")
  if (userProfile.occupation && scheme.description.toLowerCase().includes(userProfile.occupation.toLowerCase()))
    matches.push(`✅ For ${userProfile.occupation}s`)
  if (userProfile.caste && scheme.eligibility.toLowerCase().includes(userProfile.caste.toLowerCase()))
    matches.push("✅ Category matches")

  if (matches.length > 0) {
    lines.push(`\n**Why You Match:**\n${matches.join("\n")}`)
  }

  // Application process
  const applySteps = scheme.apply
    .split(/[,.]/)
    .filter((x) => x.trim())
    .slice(0, 2)
  lines.push(`\n**Quick Steps:**`)
  applySteps.forEach((step, i) => {
    lines.push(`${i + 1}️⃣ ${step.trim()}`)
  })

  // Documents
  if (scheme.documents) {
    const docs = scheme.documents
      .split(",")
      .slice(0, 3)
      .map((d) => d.trim())
    lines.push(`\n📄 **Need:** ${docs.join(", ")}`)
  }

  // Deadline
  if (scheme.deadline && scheme.deadline !== "Ongoing") {
    lines.push(`\n⏰ **Deadline:** ${scheme.deadline}`)
  }

  return lines.join("\n")
}

// Search schemes
function searchSchemes(query) {
  const q = query.toLowerCase()
  return schemes
    .filter(
      (scheme) =>
        scheme.name.toLowerCase().includes(q) ||
        scheme.description.toLowerCase().includes(q) ||
        scheme.category.toLowerCase().includes(q) ||
        scheme.tags.toLowerCase().includes(q) ||
        scheme.benefits.toLowerCase().includes(q),
    )
    .slice(0, 5)
}

// Get permanent menu keyboard with support button
function getPermanentMenu() {
  const buttons = [
    [Markup.button.callback("🔍 Search Schemes", "menu_search")],
    [Markup.button.callback("📊 My Profile", "menu_profile"), Markup.button.callback("🎯 Find Schemes", "menu_find")],
    [
      Markup.button.callback("📋 My Matches", "menu_matches"),
      Markup.button.callback("📚 All Categories", "menu_categories"),
    ],
    [Markup.button.callback("🔄 Restart", "menu_restart"), Markup.button.callback("🗑️ Delete Data", "menu_delete")],
    [Markup.button.callback("❓ Help", "menu_help")],
    [Markup.button.url("📞 Support", "https://t.me/govlinq")],
  ]
  return Markup.inlineKeyboard(buttons)
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN)

function getUserState(userId) {
  if (!userSessions[userId]) userSessions[userId] = { step: "welcome", data: {} }
  return userSessions[userId]
}

function setUserState(userId, state) {
  userSessions[userId] = state
}

function saveToHistory(userId, data) {
  if (!userHistory[userId]) userHistory[userId] = []
  userHistory[userId].push({ ...data, timestamp: new Date() })
}

function isProfileComplete(userData) {
  return (
    userData.name &&
    userData.age &&
    userData.gender &&
    userData.education &&
    userData.occupation &&
    userData.location &&
    userData.income !== undefined &&
    userData.familySize &&
    userData.caste &&
    userData.disability !== undefined &&
    userData.interest &&
    userData.urgency !== undefined &&
    userData.hasAadhaar !== undefined
  )
}

async function showNextQuestion(ctx, userId) {
  const state = getUserState(userId)
  const data = state.data

  let msg

  if (!data.name) {
    state.step = "name_input"
    msg = await ctx.reply("Let's build your profile step by step!\n\n📝 What's your name?")
    trackMessage(userId, msg.message_id)
  } else if (!data.age) {
    state.step = "age_input"
    msg = await ctx.reply(`Nice to meet you, ${data.name}! 👋\n\nNow enter your age (0-120):`)
    trackMessage(userId, msg.message_id)
  } else if (!data.gender) {
    msg = await ctx.reply(
      "👤 Select your gender:",
      Markup.inlineKeyboard([
        [Markup.button.callback("👨 Male", "gender_male"), Markup.button.callback("👩 Female", "gender_female")],
        [Markup.button.callback("🏳️‍⚧️ Other", "gender_other"), Markup.button.callback("⏭️ Skip", "gender_skip")],
      ]),
    )
    trackMessage(userId, msg.message_id)
  } else if (!data.education) {
    state.step = "education_input"
    msg = await ctx.reply("📚 Enter your education level (e.g., 10th, Graduate, Postgraduate):")
    trackMessage(userId, msg.message_id)
  } else if (!data.occupation) {
    state.step = "occupation_input"
    msg = await ctx.reply("💼 Enter your occupation (e.g., Farmer, Student, Business):")
    trackMessage(userId, msg.message_id)
  } else if (!data.caste) {
    msg = await ctx.reply(
      "👥 Select your category:",
      Markup.inlineKeyboard([
        [Markup.button.callback("SC", "caste_sc"), Markup.button.callback("ST", "caste_st")],
        [Markup.button.callback("OBC", "caste_obc"), Markup.button.callback("General", "caste_gen")],
        [Markup.button.callback("⏭️ Skip", "caste_skip")],
      ]),
    )
    trackMessage(userId, msg.message_id)
  } else if (!data.location) {
    state.step = "location_input"
    msg = await ctx.reply("📍 Enter your state or city:")
    trackMessage(userId, msg.message_id)
  } else if (data.income === undefined) {
    state.step = "income_input"
    msg = await ctx.reply("💰 Enter your annual income in lakhs (e.g., 3 for ₹3 lakhs, 0 for unemployed):")
    trackMessage(userId, msg.message_id)
  } else if (!data.familySize) {
    state.step = "family_input"
    msg = await ctx.reply("👨‍👩‍👧‍👦 Enter your family size (number of members):")
    trackMessage(userId, msg.message_id)
  } else if (data.disability === undefined) {
    msg = await ctx.reply(
      "♿ Is there any person with disability in your family?",
      Markup.inlineKeyboard([
        [Markup.button.callback("Yes", "disability_yes"), Markup.button.callback("No", "disability_no")],
      ]),
    )
    trackMessage(userId, msg.message_id)
  } else if (!data.interest) {
    msg = await ctx.reply(
      "🎯 What is your main area of interest?",
      Markup.inlineKeyboard([
        [Markup.button.callback("🧑‍🎓 Education", "int_education"), Markup.button.callback("🏥 Health", "int_health")],
        [
          Markup.button.callback("🏠 Housing", "int_housing"),
          Markup.button.callback("🌾 Agriculture", "int_agriculture"),
        ],
        [Markup.button.callback("💼 Employment", "int_employment"), Markup.button.callback("👩‍👧 Women", "int_women")],
        [Markup.button.callback("🔍 All Schemes", "int_all")],
      ]),
    )
    trackMessage(userId, msg.message_id)
  } else if (data.urgency === undefined) {
    msg = await ctx.reply(
      "⚡ How urgent do you need the scheme?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("🔥 Very Urgent", "urgency_high"),
          Markup.button.callback("⏰ Normal", "urgency_normal"),
        ],
      ]),
    )
    trackMessage(userId, msg.message_id)
  } else if (data.hasAadhaar === undefined) {
    msg = await ctx.reply(
      "🆔 Do you have an Aadhaar card?",
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Yes", "aadhaar_yes"), Markup.button.callback("❌ No", "aadhaar_no")],
      ]),
    )
    trackMessage(userId, msg.message_id)
  } else {
    // Profile complete
    state.step = "complete"
    setUserState(userId, state)
    msg = await ctx.replyWithMarkdown(
      '✅ **Profile Complete!**\n\nYou can now:\n• Click "🎯 Find Schemes" to get personalized matches\n• Update your profile anytime\n• Search for specific schemes',
      getPermanentMenu(),
    )
    trackMessage(userId, msg.message_id)
  }
}

// Show profile
async function showProfile(ctx, userId) {
  const state = getUserState(userId)
  const d = state.data

  let msg = "👤 **Your Profile:**\n\n"
  msg += d.name ? `📝 Name: ${d.name}\n` : "❌ Name: Not set\n"
  msg += d.age ? `🎂 Age: ${d.age}\n` : "❌ Age: Not set\n"
  msg += d.gender ? `👤 Gender: ${d.gender}\n` : "❌ Gender: Not set\n"
  msg += d.education ? `📚 Education: ${d.education}\n` : "❌ Education: Not set\n"
  msg += d.occupation ? `💼 Occupation: ${d.occupation}\n` : "❌ Occupation: Not set\n"
  msg += d.caste ? `👥 Category: ${d.caste}\n` : "❌ Category: Not set\n"
  msg += d.location ? `📍 Location: ${d.location}\n` : "❌ Location: Not set\n"
  msg += d.income !== undefined ? `💰 Income: ₹${d.income} lakhs\n` : "❌ Income: Not set\n"
  msg += d.familySize ? `👨‍👩‍👧‍👦 Family: ${d.familySize} members\n` : "❌ Family Size: Not set\n"
  msg += d.disability !== undefined ? `♿ Disability: ${d.disability ? "Yes" : "No"}\n` : "❌ Disability: Not set\n"
  msg += d.interest ? `🎯 Interest: ${d.interest}\n` : "❌ Interest: Not set\n"
  msg += d.urgency ? `⚡ Urgency: ${d.urgency}\n` : "❌ Urgency: Not set\n"
  msg += d.hasAadhaar !== undefined ? `🆔 Aadhaar: ${d.hasAadhaar ? "Yes" : "No"}\n` : "❌ Aadhaar: Not set\n"

  const updateButtons = [
    [
      Markup.button.callback("🎂 Update Age", "update_age"),
      Markup.button.callback("📚 Update Education", "update_education"),
    ],
    [
      Markup.button.callback("💼 Update Occupation", "update_occupation"),
      Markup.button.callback("📍 Update Location", "update_location"),
    ],
    [
      Markup.button.callback("💰 Update Income", "update_income"),
      Markup.button.callback("👨‍👩‍👧‍👦 Update Family", "update_family"),
    ],
    [Markup.button.callback("🔙 Back to Menu", "back_to_menu")],
  ]

  const sentMsg = await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(updateButtons))
  trackMessage(userId, sentMsg.message_id)
}

// Find schemes
async function findSchemes(ctx, userId) {
  const state = getUserState(userId)
  const d = state.data

  if (!isProfileComplete(d)) {
    const msg = await ctx.reply(
      '❌ Please complete your profile first!\n\nClick "📊 My Profile" to add details.',
      getPermanentMenu(),
    )
    trackMessage(userId, msg.message_id)

    if (!d.name) {
      await showNextQuestion(ctx, userId)
    }
    return
  }

  const msg1 = await ctx.replyWithMarkdown(
    "🧠 **Neural Network Processing...**\n\n⚡ Analyzing 12 layers\n🎯 Finding perfect matches",
  )
  trackMessage(userId, msg1.message_id)

  const matches = neuralMatchSchemes(d)

  if (matches.length === 0) {
    const msg2 = await ctx.replyWithMarkdown(
      "🔍 **No matches found!**\n\n" +
        "Try:\n" +
        "• Update your profile details\n" +
        '• Select "All Schemes" as interest\n' +
        "• Browse by category\n" +
        "• Direct search: /search [keyword]",
      getPermanentMenu(),
    )
    trackMessage(userId, msg2.message_id)
    return
  }

  state.matchedSchemes = matches
  saveToHistory(userId, { matches, profileData: d })
  setUserState(userId, state)

  let msgText = `🎉 **Found ${matches.length} Perfect Matches!**\n\n`
  msgText += `✨ Neural analysis complete\n\n`

  matches.forEach((s, i) => {
    const matchPercent = Math.round((s.matchScore / 250) * 100)
    msgText += `${i + 1}. **${s.name}**\n`
    msgText += ` 🎯 ${matchPercent}% Match | ${s.category}\n`
    msgText += ` 💰 ${s.benefits.slice(0, 50)}...\n\n`
  })

  const buttons = matches.map((s, i) => [Markup.button.callback(`${i + 1}. ${s.name.slice(0, 30)}...`, `scheme_${i}`)])
  buttons.push([Markup.button.callback("🔙 Main Menu", "back_to_menu")])

  const msg3 = await ctx.replyWithMarkdown(msgText, Markup.inlineKeyboard(buttons))
  trackMessage(userId, msg3.message_id)
}

// Show previous matches
async function showMatches(ctx, userId) {
  const history = userHistory[userId]
  if (!history || history.length === 0) {
    const msg = await ctx.reply('📋 No previous searches yet!\n\nClick "🎯 Find Schemes" to start.', getPermanentMenu())
    trackMessage(userId, msg.message_id)
    return
  }

  const last = history[history.length - 1]
  const state = getUserState(userId)
  state.matchedSchemes = last.matches
  setUserState(userId, state)

  let msgText = `📋 **Your Last Search Results:**\n\n`
  msgText += `🕒 ${last.timestamp.toLocaleString()}\n\n`

  last.matches.forEach((s, i) => {
    msgText += `${i + 1}. ${s.name}\n`
  })

  const buttons = last.matches.map((s, i) => [Markup.button.callback(`View ${s.name.slice(0, 25)}...`, `scheme_${i}`)])
  buttons.push([Markup.button.callback("🔙 Main Menu", "back_to_menu")])

  const sentMsg = await ctx.replyWithMarkdown(msgText, Markup.inlineKeyboard(buttons))
  trackMessage(userId, sentMsg.message_id)
}

// Show categories
async function showCategories(ctx) {
  const userId = ctx.from.id
  const categories = [...new Set(schemes.map((s) => s.category))]
  const buttons = categories.map((cat) => [
    Markup.button.callback(`${getCategoryEmoji(cat)} ${cat}`, `cat_${cat.toLowerCase()}`),
  ])
  buttons.push([Markup.button.callback("🔙 Main Menu", "back_to_menu")])

  const msg = await ctx.reply("📚 Browse by Category:", Markup.inlineKeyboard(buttons))
  trackMessage(userId, msg.message_id)
}

function getCategoryEmoji(category) {
  const emojiMap = {
    Education: "🧑‍🎓",
    Health: "🏥",
    Housing: "🏠",
    Agriculture: "🌾",
    Employment: "💼",
    Women: "👩‍👧",
    General: "📋",
  }
  return emojiMap[category] || "📋"
}

// Show help
async function showHelp(ctx) {
  const userId = ctx.from.id
  const msg =
    `🆘 **GovLinq Bot Guide**\n\n` +
    `**Main Menu Buttons:**\n` +
    `🔍 Search - Quick keyword search\n` +
    `📊 Profile - View/edit your details\n` +
    `🎯 Find Schemes - AI-powered matching\n` +
    `📋 My Matches - View previous results\n` +
    `📚 Categories - Browse by category\n` +
    `🔄 Restart - Reset & re-ask all questions\n` +
    `🗑️ Delete Data - Remove data & all messages\n` +
    `❓ Help - This guide\n` +
    `📞 Support - Contact support team\n\n` +
    `**Commands:**\n` +
    `/start - Begin or restart\n` +
    `/search [word] - Direct search\n` +
    `/restart - Fresh start\n` +
    `/help - This guide\n\n` +
    `**Features:**\n` +
    `✅ 12-layer neural matching\n` +
    `✅ AI-powered summaries\n` +
    `✅ 100% clickable interface\n` +
    `✅ Auto message deletion\n` +
    `✅ Complete profile setup\n` +
    `✅ Secure & private\n\n` +
    `**Need Help?**\n` +
    `Click "📞 Support" button to contact our team`

  const helpKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback("🔙 Back to Menu", "back_to_menu")],
    [Markup.button.url("📞 Support - @govlinq", "https://t.me/govlinq")],
  ])

  const sentMsg = await ctx.replyWithMarkdown(msg, helpKeyboard)
  trackMessage(userId, sentMsg.message_id)
}

// Handle all text messages (including commands starting with /)
bot.on("text", async (ctx) => {
  const userId = ctx.from.id
  const state = getUserState(userId)
  const text = ctx.message.text

  trackMessage(userId, ctx.message.message_id)

  // Handle commands
  if (text.startsWith("/start")) {
    // Initialize or reset user state
    userSessions[userId] = { step: "welcome", data: {} }
    
    const welcomeMsg = await ctx.replyWithMarkdown(
      "🚀 **Welcome to GovLinq Bot!**\n\n" +
        "🧠 Powered by Neural Network AI\n" +
        "🎯 12-Layer Matching System\n" +
        "📱 100% Clickable Interface\n" +
        "🔒 Your Data is Private\n" +
        "🗑️ Auto Message Deletion\n\n" +
        "👇 **Use buttons below - No typing needed!**",
      getPermanentMenu(),
    )
    trackMessage(userId, welcomeMsg.message_id)

    // Check if profile is complete
    if (!isProfileComplete(userSessions[userId].data)) {
      setTimeout(async () => {
        const msg = await ctx.reply("Let's build your profile step by step!\n\n📝 What's your name?")
        trackMessage(userId, msg.message_id)
        userSessions[userId].step = "name_input"
      }, 1500)
    }
    return
  }
  else if (text.startsWith("/help")) {
    await showHelp(ctx)
    return
  }
  else if (text.startsWith("/restart")) {
    userSessions[userId] = { step: "welcome", data: {} }

    const msg1 = await ctx.reply("🔄 Complete restart initiated!")
    trackMessage(userId, msg1.message_id)

    setTimeout(async () => {
      const msg2 = await ctx.reply("Let's set up your profile from the beginning!\n\n📝 What's your name?")
      trackMessage(userId, msg2.message_id)
      userSessions[userId].step = "name_input"
    }, 1000)
    return
  }
  else if (text.startsWith("/search ")) {
    const query = text.replace("/search ", "")
    const results = searchSchemes(query)
    if (results.length > 0) {
      let msg = `🔍 Found ${results.length} schemes for "${query}":\n\n`
      results.forEach((s, i) => {
        msg += `${i + 1}. *${s.name}*\n📝 ${s.description.slice(0, 70)}...\n🔗 ${s.link}\n\n`
      })
      const sentMsg = await ctx.replyWithMarkdown(msg, getPermanentMenu())
      trackMessage(userId, sentMsg.message_id)
    } else {
      const sentMsg = await ctx.reply("❌ No results. Try different keywords.", getPermanentMenu())
      trackMessage(userId, sentMsg.message_id)
    }
    return
  }
  else if (text.startsWith("/")) {
    // Handle other unknown commands
    const sentMsg = await ctx.reply(
      "❓ Unknown command. Use /start to begin or use the menu buttons below:",
      getPermanentMenu()
    )
    trackMessage(userId, sentMsg.message_id)
    return
  }

  // Handle conversation steps (non-command text)
  switch (state.step) {
    case "name_input":
      state.data.name = text
      state.step = "menu"
      setUserState(userId, state)
      const nameMsg = await ctx.reply(`✅ Name: ${text}`)
      trackMessage(userId, nameMsg.message_id)
      await showNextQuestion(ctx, userId)
      break

    case "search_query":
      const results = searchSchemes(text)
      if (results.length > 0) {
        const buttons = results.map((s, i) => [Markup.button.callback(`${s.name.slice(0, 30)}...`, `view_${i}`)])
        state.searchResults = results
        setUserState(userId, state)
        const searchMsg = await ctx.reply(`Found ${results.length} schemes:`, Markup.inlineKeyboard(buttons))
        trackMessage(userId, searchMsg.message_id)
      } else {
        const noResultMsg = await ctx.reply("No schemes found. Try again:", getPermanentMenu())
        trackMessage(userId, noResultMsg.message_id)
      }
      state.step = "menu"
      break

    case "age_input":
      const age = Number.parseInt(text)
      if (isNaN(age) || age < 0 || age > 120) {
        const errMsg = await ctx.reply("❌ Invalid age. Enter 0-120:")
        trackMessage(userId, errMsg.message_id)
        return
      }
      state.data.age = age
      state.step = "menu"
      setUserState(userId, state)
      const ageMsg = await ctx.reply(`✅ Age set to ${age}`)
      trackMessage(userId, ageMsg.message_id)
      await showNextQuestion(ctx, userId)
      break

    case "education_input":
      state.data.education = text
      state.step = "menu"
      setUserState(userId, state)
      const eduMsg = await ctx.reply(`✅ Education: ${text}`)
      trackMessage(userId, eduMsg.message_id)
      await showNextQuestion(ctx, userId)
      break

    case "occupation_input":
      state.data.occupation = text
      state.step = "menu"
      setUserState(userId, state)
      const occMsg = await ctx.reply(`✅ Occupation: ${text}`)
      trackMessage(userId, occMsg.message_id)
      await showNextQuestion(ctx, userId)
      break

    case "location_input":
      state.data.location = text
      state.step = "menu"
      setUserState(userId, state)
      const locMsg = await ctx.reply(`✅ Location: ${text}`)
      trackMessage(userId, locMsg.message_id)
      await showNextQuestion(ctx, userId)
      break

    case "income_input":
      const income = Number.parseFloat(text)
      if (isNaN(income) || income < 0) {
        const incErrMsg = await ctx.reply("❌ Invalid amount. Enter again:")
        trackMessage(userId, incErrMsg.message_id)
        return
      }
      state.data.income = income
      state.step = "menu"
      setUserState(userId, state)
      const incMsg = await ctx.reply(`✅ Income: ₹${income} lakhs`)
      trackMessage(userId, incMsg.message_id)
      await showNextQuestion(ctx, userId)
      break

    case "family_input":
      const size = Number.parseInt(text)
      if (isNaN(size) || size < 1) {
        const famErrMsg = await ctx.reply("❌ Invalid number. Enter 1 or more:")
        trackMessage(userId, famErrMsg.message_id)
        return
      }
      state.data.familySize = size
      state.step = "menu"
      setUserState(userId, state)
      const famMsg = await ctx.reply(`✅ Family size: ${size}`)
      trackMessage(userId, famMsg.message_id)
      await showNextQuestion(ctx, userId)
      break

    default:
      const defMsg = await ctx.reply("👋 Use menu buttons below:", getPermanentMenu())
      trackMessage(userId, defMsg.message_id)
  }
})

// Callback handler
bot.on("callback_query", async (ctx) => {
  const userId = ctx.from.id
  const state = getUserState(userId)
  const data = ctx.callbackQuery.data
  
  try {
    await ctx.answerCbQuery()
  } catch (error) {
    console.log("Callback query answer error:", error.message)
  }

  // Menu actions
  if (data === "menu_search") {
    state.step = "search_query"
    setUserState(userId, state)
    const msg = await ctx.reply('🔍 Enter keywords to search:\n(e.g., "education", "farmer", "health")')
    trackMessage(userId, msg.message_id)
  } 
  else if (data === "menu_profile") {
    await showProfile(ctx, userId)
  } 
  else if (data === "menu_find") {
    await findSchemes(ctx, userId)
  } 
  else if (data === "menu_matches") {
    await showMatches(ctx, userId)
  } 
  else if (data === "menu_categories") {
    await showCategories(ctx)
  } 
  else if (data === "menu_restart") {
    const msg1 = await ctx.reply("🔄 Restarting... All data will be reset.")
    trackMessage(userId, msg1.message_id)

    // Clear user data completely
    userSessions[userId] = { step: "welcome", data: {} }

    setTimeout(async () => {
      const msg2 = await ctx.reply(
        "🆕 **Fresh Start!**\n\nLet's build your profile from scratch.\n\n📝 What's your name?",
      )
      trackMessage(userId, msg2.message_id)
      userSessions[userId].step = "name_input"
    }, 1000)
  } 
  else if (data === "menu_delete") {
    const msg = await ctx.reply(
      "🗑️ This will:\n• Delete all your data\n• Remove ALL chat messages\n• Start fresh\n\nConfirm?",
      Markup.inlineKeyboard([
        [
          Markup.button.callback("✅ Yes, Delete Everything", "confirm_delete"),
          Markup.button.callback("❌ Cancel", "cancel_delete"),
        ],
      ]),
    )
    trackMessage(userId, msg.message_id)
  } 
  else if (data === "menu_help") {
    await showHelp(ctx)
  }
  else if (data === "back_to_menu") {
    const msg = await ctx.reply("📱 **Main Menu**\n\nSelect an option:", getPermanentMenu())
    trackMessage(userId, msg.message_id)
  }

  // Profile inputs
  else if (data.startsWith("gender_")) {
    const genderMap = { gender_male: "Male", gender_female: "Female", gender_other: "Other", gender_skip: "skip" }
    state.data.gender = genderMap[data]
    await ctx.editMessageText(`✅ Gender: ${genderMap[data]}`)
    await showNextQuestion(ctx, userId)
  } 
  else if (data.startsWith("caste_")) {
    const casteMap = { caste_sc: "SC", caste_st: "ST", caste_obc: "OBC", caste_gen: "General", caste_skip: "skip" }
    state.data.caste = casteMap[data]
    await ctx.editMessageText(`✅ Category: ${casteMap[data]}`)
    await showNextQuestion(ctx, userId)
  } 
  else if (data.startsWith("disability_")) {
    state.data.disability = data === "disability_yes"
    await ctx.editMessageText(`✅ Disability: ${state.data.disability ? "Yes" : "No"}`)
    await showNextQuestion(ctx, userId)
  } 
  else if (data.startsWith("int_")) {
    const intMap = {
      int_education: "education",
      int_health: "health",
      int_housing: "housing",
      int_agriculture: "agriculture",
      int_employment: "employment",
      int_women: "women",
      int_all: "all",
    }
    state.data.interest = intMap[data]
    await ctx.editMessageText(`✅ Interest: ${intMap[data]}`)
    await showNextQuestion(ctx, userId)
  } 
  else if (data.startsWith("urgency_")) {
    state.data.urgency = data === "urgency_high" ? "high" : "normal"
    await ctx.editMessageText(`✅ Urgency: ${state.data.urgency}`)
    await showNextQuestion(ctx, userId)
  } 
  else if (data.startsWith("aadhaar_")) {
    state.data.hasAadhaar = data === "aadhaar_yes"
    state.data.hasDocuments = data === "aadhaar_yes"
    await ctx.editMessageText(`✅ Aadhaar: ${state.data.hasAadhaar ? "Yes" : "No"}`)
    await showNextQuestion(ctx, userId)
  }

  // Profile field updates
  else if (data === "update_age") {
    state.step = "age_input"
    setUserState(userId, state)
    const msg = await ctx.reply("Enter your age:")
    trackMessage(userId, msg.message_id)
  } 
  else if (data === "update_education") {
    state.step = "education_input"
    setUserState(userId, state)
    const msg = await ctx.reply("Enter education level:")
    trackMessage(userId, msg.message_id)
  } 
  else if (data === "update_occupation") {
    state.step = "occupation_input"
    setUserState(userId, state)
    const msg = await ctx.reply("Enter your occupation:")
    trackMessage(userId, msg.message_id)
  } 
  else if (data === "update_location") {
    state.step = "location_input"
    setUserState(userId, state)
    const msg = await ctx.reply("Enter your state/city:")
    trackMessage(userId, msg.message_id)
  } 
  else if (data === "update_income") {
    state.step = "income_input"
    setUserState(userId, state)
    const msg = await ctx.reply("Enter annual income (in lakhs):")
    trackMessage(userId, msg.message_id)
  } 
  else if (data === "update_family") {
    state.step = "family_input"
    setUserState(userId, state)
    const msg = await ctx.reply("Enter family size:")
    trackMessage(userId, msg.message_id)
  } 
  else if (data === "confirm_delete") {
    try {
      await ctx.editMessageText("🗑️ Deleting all data and messages...")

      // Delete all tracked messages
      await deleteAllMessages(ctx, userId)

      // Clear all user data
      delete userSessions[userId]
      delete userHistory[userId]

      // Send confirmation message (this will be the only message left)
      const msg = await ctx.reply(
        "✅ **Everything deleted!**\n\nClick the button below to start fresh:",
        Markup.inlineKeyboard([[Markup.button.callback("🚀 Start Fresh", "start_fresh")]]),
      )
      trackMessage(userId, msg.message_id)
    } catch (error) {
      console.error("Error during deletion:", error)
      await ctx.reply("⚠️ Some messages couldn't be deleted (too old), but your data is cleared.")
    }
  } 
  else if (data === "cancel_delete") {
    await ctx.editMessageText("❌ Cancelled")
    const msg = await ctx.reply("Your data is safe.", getPermanentMenu())
    trackMessage(userId, msg.message_id)
  } 
  else if (data === "start_fresh") {
    userSessions[userId] = { step: "welcome", data: {} }
    const welcomeMsg = await ctx.replyWithMarkdown(
      "🚀 **Welcome to GovLinq Bot!**\n\n" +
        "🧠 Powered by Neural Network AI\n" +
        "🎯 12-Layer Matching System\n" +
        "📱 100% Clickable Interface\n" +
        "🔒 Your Data is Private\n" +
        "🗑️ Auto Message Deletion\n\n" +
        "Let's build your profile!\n\n📝 What's your name?",
    )
    trackMessage(userId, welcomeMsg.message_id)
    userSessions[userId].step = "name_input"
  }

  // View scheme details
  else if (data.startsWith("view_")) {
    const idx = Number.parseInt(data.replace("view_", ""))
    const scheme = state.searchResults?.[idx] || state.matchedSchemes?.[idx]
    if (scheme) {
      const summary = aiSummarize(scheme, state.data)
      const msg = await ctx.replyWithMarkdown(
        `📋 **${scheme.name}**\n\n` +
          `${summary}\n\n` +
          `**Full Details:**\n${scheme.description}\n\n` +
          `**Benefits:**\n${scheme.benefits}\n\n` +
          `**How to Apply:**\n${scheme.apply}\n\n` +
          `🔗 [Apply Now](${scheme.link})`,
        getPermanentMenu(),
      )
      trackMessage(userId, msg.message_id)
    }
  } 
  else if (data.startsWith("scheme_")) {
    const idx = Number.parseInt(data.replace("scheme_", ""))
    const scheme = state.matchedSchemes?.[idx]
    if (scheme) {
      const summary = aiSummarize(scheme, state.data)
      const matchPercent = scheme.matchScore ? Math.round((scheme.matchScore / 250) * 100) : 0
      const msg = await ctx.replyWithMarkdown(
        `📋 **${scheme.name}**\n` +
          `🎯 Match Score: ${matchPercent}%\n\n` +
          `${summary}\n\n` +
          `🔗 [Official Link](${scheme.link})`,
        getPermanentMenu(),
      )
      trackMessage(userId, msg.message_id)
    }
  } 
  else if (data.startsWith("cat_")) {
    const category = data.replace("cat_", "")
    const catSchemes = schemes.filter((s) => s.category.toLowerCase() === category.toLowerCase()).slice(0, 5)
    if (catSchemes.length > 0) {
      const buttons = catSchemes.map((s, i) => [
        Markup.button.callback(s.name.slice(0, 35), `catview_${category}_${i}`),
      ])
      buttons.push([Markup.button.callback("🔙 Back", "menu_categories")])
      const msg = await ctx.reply(`📚 ${category} Schemes (${catSchemes.length}):`, Markup.inlineKeyboard(buttons))
      trackMessage(userId, msg.message_id)
      state.categorySchemes = catSchemes
      setUserState(userId, state)
    }
  } 
  else if (data.startsWith("catview_")) {
    const parts = data.split("_")
    const idx = Number.parseInt(parts[2])
    const scheme = state.categorySchemes?.[idx]
    if (scheme) {
      const msg = await ctx.replyWithMarkdown(
        `📋 **${scheme.name}**\n\n` +
          `📝 ${scheme.description}\n\n` +
          `💰 **Benefits:** ${scheme.benefits}\n\n` +
          `📋 **Apply:** ${scheme.apply}\n\n` +
          `🔗 [Link](${scheme.link})`,
        getPermanentMenu(),
      )
      trackMessage(userId, msg.message_id)
    }
  }

  setUserState(userId, state)
})

// Start bot
async function startBot() {
  try {
    console.log("🔄 Loading schemes...")
    schemes = await loadSchemes()

    console.log("🚀 Starting GovLinq Advanced Bot...")
    await bot.launch()

    console.log("\n✅ Bot LIVE - Enhanced Version!")
    console.log("📱 Telegram Bot Active")
    console.log("🧠 12-Layer AI Matching Active")
    console.log("🎯 100% Clickable Interface")
    console.log("🗑️ Auto Message Deletion Enabled")
    console.log("🔄 Complete Profile Setup on Start/Restart")
    console.log("📞 Support Button Added")
    console.log("🛑 Ctrl+C to stop\n")
  } catch (error) {
    console.error("💥 Error:", error)
  }
}

process.once("SIGINT", () => {
  console.log("\n👋 Shutting down...")
  bot.stop("SIGINT")
})

process.once("SIGTERM", () => bot.stop("SIGTERM"))

startBot()