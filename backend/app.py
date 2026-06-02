from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
from datetime import datetime
from ddgs import DDGS
import re

app = FastAPI(title="AI Chat Assistant", description="General Purpose AI that knows things and searches the web when needed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# PART 1: AI's BUILT-IN KNOWLEDGE
# ============================================================

AI_KNOWLEDGE = {
    "greetings": {
        "patterns": ["^hi$", "^hello$", "^hey$", "^good morning$", "^good afternoon$", "^good evening$", "^howdy$"],
        "answer": "Hello! 👋 I'm your AI assistant. I have knowledge about many topics, and if I don't know something, I'll search the web for you. How can I help you today?",
        "confidence": 0.99
    },
    "how_are_you": {
        "patterns": ["^how are you$", "^how are you doing$", "^how's it going$"],
        "answer": "I'm doing great! 😊 Ready to help you with any question. What's on your mind today?",
        "confidence": 0.99
    },
    "what_is_your_name": {
        "patterns": ["what is your name", "your name", "who are you"],
        "answer": "I'm your AI Chat Assistant! I was created by Joshua Macapagal and Ady. I can answer questions using my built-in knowledge, and when I don't know something, I automatically search the web to give you accurate information with sources.",
        "confidence": 0.98
    },
    "who_created_you": {
        "patterns": ["who created you", "who made you", "your creator", "who built you", "who developed you"],
        "answer": "I was created by **Joshua Macapagal** and **Ady** as a general-purpose AI assistant. I can answer questions using my built-in knowledge, and when I don't know something, I automatically search the web to give you accurate, up-to-date information with sources. Ask me anything!",
        "confidence": 0.98
    },
    "what_can_you_do": {
        "patterns": ["what can you do", "capabilities", "how do you work", "what are your features", "tell me about yourself"],
        "answer": """# ✨ What I Can Do For You

I'm a general-purpose AI assistant with two powerful ways of answering your questions.

## 🧠 1. Built-in Knowledge

I already know about a wide range of topics:
- Science, mathematics, physics, chemistry, biology
- History, geography, politics, economics
- Famous people, places, events, and inventions
- Technology, computers, programming, AI
- Arts, literature, music, philosophy
- General knowledge and everyday facts

## 🌐 2. Web Search (Automatic)

When I don't know something, or when you ask about:
- Latest news and current events (today, this week)
- Recent developments (2025, 2026)
- Time-sensitive information (weather, stocks, sports scores)

**I automatically search the web** and give you comprehensive, detailed answers with clickable source links.

## 📋 What You Can Ask Me

| Category | Example Questions |
|----------|-------------------|
| General Knowledge | "What is artificial intelligence?", "Who is Albert Einstein?" |
| Definitions | "What is RAG?", "Define machine learning" |
| History | "Who was Jose Rizal?", "Tell me about World War 2" |
| Science | "How does photosynthesis work?", "What is a black hole?" |
| Technology | "What is Python?", "How do neural networks work?" |
| Current Events | "Latest news today", "What's new in AI 2026?" |
| Casual Chat | "Hello", "How are you?", "What's your name?" |

Go ahead — ask me anything! I'm here to help with detailed, accurate answers. 🚀""",
        "confidence": 0.98
    },
    "mathematics": {
        "patterns": ["what is mathematics", "what is math", "mathematics", "math definition", "define mathematics"],
        "answer": """# 📐 What is Mathematics?

Mathematics is the science of structure, order, and relation that has evolved from counting, measuring, and describing the shapes of objects. At its core, mathematics is the study of patterns, quantity, space, and change.

## The Four Main Branches of Mathematics

### 1. Arithmetic and Number Theory
The study of numbers and basic operations. Key concepts include addition, subtraction, multiplication, division, prime numbers, and fractions. Real-world applications include cryptography, computer science algorithms, and financial calculations.

### 2. Algebra
The study of symbols and the rules for manipulating them. Key concepts include variables (x, y, z), equations, inequalities, polynomials, and functions. Real-world applications include engineering calculations, computer programming, economics, and physics.

### 3. Geometry and Trigonometry
The study of shapes, sizes, positions, and properties of space. Key concepts include points, lines, angles, triangles, circles, the Pythagorean theorem (a² + b² = c²), sine, cosine, and tangent. Real-world applications include architecture, navigation, GPS, computer graphics, and astronomy.

### 4. Calculus
The study of change and motion. Calculus has two main branches:
- **Differential Calculus** studies instantaneous rates of change (like how fast a car is going at this exact moment)
- **Integral Calculus** studies accumulation of quantities (like total distance traveled over time)

Real-world applications include physics, engineering, economics, medicine, and climate science.

## Mathematics Subfields

| Field | What It Studies | Real-World Example |
|-------|-----------------|---------------------|
| Statistics | Data collection and analysis | Polls, scientific studies |
| Probability | Randomness and chance | Weather forecasting |
| Linear Algebra | Vectors and matrices | 3D graphics, machine learning |
| Differential Equations | Change over time | Population growth, climate models |
| Topology | Properties under deformation | Network routing |
| Logic | Principles of valid reasoning | Computer processors |
| Combinatorics | Counting and arrangements | Scheduling, lottery odds |

## Pure vs Applied Mathematics

**Pure Mathematics** explores math for its own intellectual beauty. Pure mathematicians aren't concerned with practical applications. Famous pure mathematicians include Euclid, Carl Friedrich Gauss, and Georg Cantor. Interestingly, many "useless" pure math concepts later became essential: number theory (1800s) now secures credit card encryption, and Boolean algebra (1840s) is the foundation of computer circuits.

**Applied Mathematics** takes abstract mathematical frameworks and uses them to solve real-world problems in physics, engineering, computer science, economics, biology, medicine, finance, and climate science.

## Why Mathematics Matters

1. Mathematics is the language of science — every scientific discovery is expressed in mathematics
2. Mathematics provides certainty through proofs — once proven true, a theorem stays true forever
3. Mathematics trains your brain in logical thinking, problem-solving, pattern recognition, and abstract reasoning

## Famous Mathematicians

| Mathematician | Contribution | Time Period |
|---------------|--------------|-------------|
| Pythagoras | Pythagorean theorem | ~500 BCE |
| Euclid | Geometry | ~300 BCE |
| Isaac Newton | Calculus | 1600s |
| Carl Friedrich Gauss | Number theory, statistics | 1700s-1800s |
| Alan Turing | Computer science, cryptography | 1900s |

Is there a specific area of mathematics you'd like me to explain in more detail? 📐""",
        "confidence": 0.95
    },
    "artificial_intelligence": {
        "patterns": ["what is ai", "what is artificial intelligence", "ai definition", "define artificial intelligence"],
        "answer": """# 🤖 What is Artificial Intelligence?

Artificial Intelligence (AI) is the simulation of human intelligence in machines that are programmed to think, learn, and make decisions like humans.

## Main Branches of AI

| Branch | What It Does | Real-World Example |
|--------|--------------|-------------------|
| Machine Learning | Learns from data | Netflix recommendations, spam filters |
| Computer Vision | Understands images | Facial recognition, self-driving cars |
| Natural Language Processing | Understands language | ChatGPT, Google Translate |
| Robotics | Physical tasks | Warehouse robots, surgery bots |

## Types of AI

- **Narrow AI** — Designed for specific tasks (ChatGPT, Siri, Alexa). This is what exists today.
- **General AI** — Human-like intelligence across any task. This is still theoretical.
- **Super AI** — Surpasses human intelligence. This is hypothetical.

## Real-World Applications

- Healthcare: Disease diagnosis, drug discovery
- Transportation: Self-driving cars, traffic prediction
- Finance: Fraud detection, algorithmic trading
- Education: Personalized learning, tutoring systems
- Entertainment: Content recommendations, game AI

## How Machine Learning Works

1. Collect data (examples, images, text)
2. Train a model on the data
3. Test the model on new data
4. Deploy the model to make predictions

## What is RAG (Retrieval-Augmented Generation)?

RAG is an advanced technique that enhances Large Language Models by allowing them to retrieve and use external information before generating a response. This solves the problem of outdated knowledge and reduces hallucination. RAG works by: (1) User asks a question, (2) System searches for relevant documents, (3) Retrieved information is added to the LLM's context, (4) LLM generates an answer using only the retrieved information.

## The Future of AI

AI is rapidly evolving. Current trends include Generative AI (ChatGPT, Midjourney, DALL-E), AI agents that can perform tasks autonomously, and ethical AI development.

Want to dive deeper into any specific area of AI? 🚀""",
        "confidence": 0.95
    },
    "michael_jackson": {
        "patterns": ["who is michael jackson", "michael jackson", "tell me about michael jackson"],
        "answer": """# 🎤 Michael Jackson: The King of Pop (1958-2009)

Michael Joseph Jackson was an American singer, songwriter, dancer, and philanthropist. Dubbed the "King of Pop," he is regarded as one of the most significant cultural figures of the 20th century and one of the greatest entertainers in history.

## Career Highlights

| Milestone | Achievement |
|-----------|-------------|
| Jackson 5 Era | Started at age 6, hits like "I Want You Back" and "ABC" |
| Off the Wall (1979) | First solo album with Quincy Jones; 4 Top 10 hits |
| Thriller (1982) | Best-selling album of all time (estimated 100 million copies) |
| Bad (1987) | First album to produce 5 consecutive #1 singles |
| Dangerous (1991) | Most successful new jack swing album |
| HIStory (1995) | Best-selling multiple-disc album of all time |

## Iconic Dance Moves

- **The Moonwalk** — Debuted during Motown 25 TV special in 1983
- **The Anti-Gravity Lean** — Used in "Smooth Criminal" video with special shoes
- **The Robot** — Mastered from street dance culture
- **The Toe Stand** — Signature pose balancing on toes

## Major Achievements

- 13 Grammy Awards (including 8 in one night for Thriller)
- 26 American Music Awards (including Artist of the Century)
- 2,500+ awards worldwide (Guinness World Record)
- Rock and Roll Hall of Fame inducted twice (solo and with Jackson 5)
- Best-selling music artist of all time (estimated 400 million records sold)

## Revolutionary Contributions

**Music Videos:** Michael Jackson transformed music videos from basic promotional clips into an art form. Thriller (1983) was a 14-minute horror-themed video that changed music videos forever. Billie Jean was the first music video by a Black artist to receive heavy rotation on MTV.

**Philanthropy:** He co-wrote "We Are the World" (1985) which raised $63 million for African famine relief. He founded the Heal the World Foundation (1992) for children's charities. He holds the Guinness World Record for most charities supported by a pop star (39).

## Death and Legacy

Michael Jackson died on June 25, 2009, at age 50 in Los Angeles, California. His memorial service was watched by an estimated 2.5 billion viewers worldwide. His legacy continues to influence countless artists including Beyoncé, Justin Timberlake, Bruno Mars, and The Weeknd.

Would you like to know more about his music, his influence, or his humanitarian work? 🎵""",
        "confidence": 0.95
    }
}

# ============================================================
# PART 2: TIME-SENSITIVE KEYWORDS
# ============================================================

TIME_SENSITIVE_KEYWORDS = [
    "latest", "today", "current", "breaking", "update", "news", 
    "weather", "2025", "2026", "now", "recent", "price", "stock", 
    "score", "yesterday", "this week", "this month", "headlines",
    "forecast", "trending", "newest", "recently"
]

# ============================================================
# PART 3: WEB SEARCH FUNCTION
# ============================================================

def search_web(query: str, max_results: int = 8) -> List[Dict]:
    """Search the web using DuckDuckGo (free, no API key needed)"""
    try:
        # Clean the query for better search results
        search_query = query
        
        # Remove common question phrases
        question_phrases = [
            "what is", "who is", "tell me about", "explain", "define", 
            "can you", "could you", "please", "what are", "what does",
            "how does", "how do", "why is", "why does"
        ]
        for phrase in question_phrases:
            if query.lower().startswith(phrase):
                search_query = query.lower().replace(phrase, "").strip()
                break
        
        # Remove greetings
        greetings = ["hi", "hello", "hey", "good morning", "good afternoon"]
        for g in greetings:
            if search_query.lower().startswith(g):
                search_query = search_query.lower().replace(g, "").strip()
                break
        
        # If query is too short, use original
        if len(search_query) < 3:
            search_query = query
        
        print(f"🔍 Searching web for: {search_query}")
        
        with DDGS() as ddgs:
            results = list(ddgs.text(search_query, max_results=max_results))
            
            if not results:
                print(f"⚠️ No results found for: {search_query}")
                return []
            
            formatted_results = []
            for r in results:
                formatted_results.append({
                    'title': r.get('title', 'No title'),
                    'url': r.get('href', '#'),
                    'snippet': r.get('body', 'No description available'),
                })
            
            print(f"✅ Found {len(formatted_results)} results")
            return formatted_results
            
    except Exception as e:
        print(f"❌ Search error: {e}")
        return []

# ============================================================
# PART 4: FORMAT ANSWER FUNCTION
# ============================================================

def format_comprehensive_answer(query: str, results: List[Dict]) -> str:
    """Create a comprehensive, detailed answer from web search results"""
    if not results:
        return f"""# 🔍 {query.title()}

I searched the web but couldn't find enough information to give you a complete answer.

## 💡 Suggestions:

- Try rephrasing your question
- Be more specific about what you want to know
- Ask about a different aspect of the topic

I'm here to help — please try asking again! 🙏"""

    # Extract the main topic
    topic = query
    for phrase in ["what is", "who is", "tell me about", "explain", "define", "can you"]:
        if query.lower().startswith(phrase):
            topic = query.lower().replace(phrase, "").strip()
            break
    topic = topic.title()
    
    # Build comprehensive answer
    answer_parts = []
    
    # Header
    answer_parts.append(f"# 🔍 {topic}")
    answer_parts.append("")
    answer_parts.append("I searched the web to give you the most complete and up-to-date information available. Here's what I found:")
    answer_parts.append("")
    
    # Main content from top results
    for i, result in enumerate(results[:5], 1):
        title = result['title']
        snippet = result['snippet']
        
        # Clean the snippet
        snippet = ' '.join(snippet.split())
        
        # Add source section
        answer_parts.append(f"## 📖 Source {i}: {title}")
        answer_parts.append("")
        answer_parts.append(snippet)
        answer_parts.append("")
        
        # Add separator between sources
        if i < len(results[:5]):
            answer_parts.append("---")
            answer_parts.append("")
    
    # Summary section
    answer_parts.append("---")
    answer_parts.append("")
    answer_parts.append("## 📝 Summary")
    answer_parts.append("")
    answer_parts.append(f"Based on {len(results[:5])} sources from the web, here's what you should know about {topic}:")
    answer_parts.append("")
    
    # Extract key points from top results
    key_points = []
    for result in results[:3]:
        snippet = result['snippet']
        first_sentence = snippet.split('.')[0] if '.' in snippet else snippet[:100]
        if len(first_sentence) > 30:
            key_points.append(f"• {first_sentence}.")
    
    for point in key_points[:3]:
        answer_parts.append(point)
    
    answer_parts.append("")
    answer_parts.append("---")
    answer_parts.append("")
    answer_parts.append("## 🔗 How to Learn More")
    answer_parts.append("")
    answer_parts.append("Check the **Sources** section below for links to the original articles. You can click on each source to read the full content.")
    answer_parts.append("")
    answer_parts.append("---")
    answer_parts.append("")
    answer_parts.append("*💡 I found this information from web search because I needed current or specific information. The sources below contain the original content — feel free to explore them for more details.*")
    
    return '\n'.join(answer_parts)

# ============================================================
# PART 5: MAIN AI DECISION ENGINE
# ============================================================

def ai_respond(question: str) -> Dict:
    """Main AI brain: decides whether to use built-in knowledge or search the web"""
    q_lower = question.lower().strip()
    
    # Step 1: Check for pure greetings
    for pattern in AI_KNOWLEDGE["greetings"]["patterns"]:
        if re.match(pattern, q_lower):
            return {
                "answer": AI_KNOWLEDGE["greetings"]["answer"],
                "sources": [],
                "confidence": 0.99,
                "from_web_search": False
            }
    
    # Step 2: Check if AI knows the answer from built-in knowledge
    for category, data in AI_KNOWLEDGE.items():
        if category in ["greetings", "how_are_you"]:
            continue
        for pattern in data["patterns"]:
            if pattern in q_lower or q_lower in pattern:
                # Check if time-sensitive (needs fresh web info)
                needs_fresh = any(keyword in q_lower for keyword in TIME_SENSITIVE_KEYWORDS)
                if needs_fresh:
                    print(f"🌐 Time-sensitive query, searching web: {question}")
                    results = search_web(question)
                    if results:
                        return {
                            "answer": format_comprehensive_answer(question, results),
                            "sources": results,
                            "confidence": 0.85,
                            "from_web_search": True
                        }
                # Return built-in knowledge answer
                return {
                    "answer": data["answer"],
                    "sources": [],
                    "confidence": data["confidence"],
                    "from_web_search": False
                }
    
    # Step 3: AI doesn't know — search the web
    print(f"🤖 AI doesn't know, searching web for: {question}")
    results = search_web(question, max_results=8)
    
    if results:
        return {
            "answer": format_comprehensive_answer(question, results),
            "sources": results,
            "confidence": 0.80,
            "from_web_search": True
        }
    
    # Step 4: No results found
    return {
        "answer": f"""# 🤔 I Couldn't Find an Answer

I searched the web for "{question}" but couldn't find enough information.

## 💡 Suggestions:

1. Rephrase your question using different keywords
2. Be more specific about what you want to know
3. Check your spelling and try again

Please try asking again with a different wording! 🙏""",
        "sources": [],
        "confidence": 0.2,
        "from_web_search": False
    }

# ============================================================
# PART 6: API ENDPOINTS
# ============================================================

@app.get("/")
def root():
    return {
        "name": "General Purpose AI Chat Assistant",
        "version": "2.0.0",
        "description": "AI that knows things and searches the web when needed",
        "how_it_works": [
            "Step 1: Check if it's a greeting → friendly response",
            "Step 2: Check built-in knowledge → detailed answer",
            "Step 3: If time-sensitive or unknown → comprehensive web search",
            "Step 4: Return complete answer with sources"
        ],
        "endpoints": {
            "/chat": "GET - Send a message to the AI",
            "/health": "GET - Check API status",
            "/": "GET - API information"
        }
    }

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/chat")
async def chat(message: str = Query(..., min_length=1, description="Your question for the AI")):
    """
    Main chat endpoint - Ask anything and the AI will respond
    """
    print(f"📝 Received question: {message}")
    response = ai_respond(message)
    return {
        "question": message,
        "answer": response["answer"],
        "sources": response["sources"],
        "confidence": response["confidence"],
        "from_web_search": response["from_web_search"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)