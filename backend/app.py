from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Dict, AsyncGenerator, Optional, Tuple
from datetime import datetime
from ddgs import DDGS
import re
import json
import asyncio
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Initialize Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    
GEMINI_SYSTEM_PROMPT = """You are Gemini, a highly accurate, smart, and helpful AI assistant. You are provided with a "Knowledge Base Context" to help answer the user's question, but you must use it critically.

STRICT RULES FOR ANSWERING:
1. RELEVANCE CHECK: Before answering, look at the user's question and the provided context. If the user asks about one topic (e.g., "What is HTML?") but the provided context is about a completely different topic (e.g., "Machine Learning"), you MUST IGNORE the context entirely.
2. GENERAL KNOWLEDGE FALLBACK: If the context is irrelevant or mismatched, do not use it. Instead, answer the user's question accurately using your own internal general knowledge.
3. DIRECT ANSWER: Always answer the user's exact question. Never change the topic or talk about what is in the context if it doesn't match the prompt.
4. FORMATTING: Use clean Markdown. Use bold text for emphasis, bullet points for lists, and clear headers to make the answer highly readable."""

app = FastAPI(
    title="AI Chat Assistant with Knowledge Base",
    description="AI with comprehensive knowledge base - searches web only when needed"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# PART 1: COMPREHENSIVE AI KNOWLEDGE BASE
# ============================================================

AI_KNOWLEDGE = {
    "greetings": {
        "patterns": ["^hi$", "^hello$", "^hey$", "^good morning$", "^good afternoon$", "^good evening$", "^howdy$", "^sup$"],
        "answer": "Hello! 👋 I'm your AI assistant. I have extensive knowledge about many topics. What can I help you with?",
        "confidence": 0.99,
        "from_web": False,
        "suggestions": [
            "Tell me about Albert Einstein",
            "What is artificial intelligence?",
            "Explain photosynthesis",
            "How does machine learning work?"
        ]
    },
    
    "how_are_you": {
        "patterns": ["^how are you$", "^how are you doing$", "^how's it going$", "how are you", "how's it going"],
        "answer": "I'm doing great! 😊 Thanks for asking. I'm here to help you with anything you need. What would you like to know?",
        "confidence": 0.99,
        "from_web": False,
        "suggestions": [
            "What topics can you help with?",
            "Tell me about climate change",
            "Explain cryptocurrency",
            "What is stoicism?"
        ]
    },
    
    "what_is_your_name": {
        "patterns": ["what is your name", "your name", "who are you", "what are you called"],
        "answer": "I'm your AI Chat Assistant! I was created by Joshua Macapagal and Ady. I have a comprehensive knowledge base and can search the web for the latest information when needed.",
        "confidence": 0.98,
        "from_web": False,
        "suggestions": [
            "Who created you?",
            "What topics do you know about?",
            "What is artificial intelligence?",
            "How does your web search work?"
        ]
    },
    
    "who_created_you": {
        "patterns": ["who created you", "who made you", "your creator", "who built you", "who developed you"],
        "answer": "I was created by **Joshua Macapagal** and **Ady** as an AI assistant with both a comprehensive knowledge base and real-time web search capabilities.",
        "confidence": 0.98,
        "from_web": False,
        "suggestions": [
            "What can you do?",
            "What topics do you know about?",
            "Tell me about artificial intelligence",
            "How does your knowledge base work?"
        ]
    },

    # ============================================================
    # SCIENCE & NATURE
    # ============================================================
    
    "photosynthesis": {
        "patterns": ["photosynthesis", "how plants make food", "plant energy"],
        "answer": """# 🌱 Photosynthesis

Photosynthesis is the process by which plants convert sunlight into chemical energy (glucose) that they can use for growth and metabolism.

## The Process

**Light-Dependent Reactions (in the thylakoid membrane):**
- Chlorophyll absorbs light energy
- Water molecules are split (H₂O → H⁺ + O₂)
- Energy is stored in ATP and NADPH
- Oxygen is released as a byproduct

**Light-Independent Reactions/Calvin Cycle (in the stroma):**
- Uses ATP and NADPH from light reactions
- Fixes CO₂ into glucose (C₆H₁₂O₆)
- Occurs even without light (but needs products from light reactions)

## The Equation

```
6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂
```

## Key Points

- Takes place in chloroplasts
- Main pigment is chlorophyll (absorbs red and blue light, reflects green)
- Rate depends on: light intensity, CO₂ concentration, temperature
- Produces oxygen as waste (great for us!)
- Occurs in all green plants, algae, and some bacteria

## Why It Matters

Photosynthesis is the foundation of almost all life on Earth. It converts light energy into chemical energy that flows through food chains. Without it, there would be no oxygen and no food!""",
        "confidence": 0.95,
        "from_web": False,
        "suggestions": [
            "What is the Calvin Cycle in detail?",
            "How do plants absorb sunlight?",
            "What is cellular respiration?",
            "Why are leaves green?"
        ]
    },

    "black_holes": {
        "patterns": ["black hole", "event horizon", "singularity"],
        "answer": """# 🌌 Black Holes

A black hole is a region in space where gravity is so strong that nothing, not even light, can escape from within its event horizon.

## Formation

Black holes form when massive stars (20+ solar masses) reach the end of their lives and undergo gravitational collapse.

**Process:**
1. Massive star runs out of fuel
2. Core collapses rapidly (supernova explosion)
3. Matter compresses to infinite density at singularity
4. Event horizon forms around the singularity

## Key Concepts

**Singularity:** Point of infinite density at center

**Event Horizon:** The point of no return - the boundary beyond which nothing can escape

**Schwarzschild Radius:** Distance from center to event horizon

## Types of Black Holes

- **Stellar:** 5-20+ solar masses, formed from star collapse
- **Supermassive:** Millions to billions of solar masses, at center of galaxies
- **Intermediate:** 100-100,000 solar masses (rare)

## Properties

- Can't be seen directly (no light escapes)
- Detected by X-rays from surrounding material
- Warp spacetime around them
- Time slows down near event horizon (time dilation)
- Eventually evaporate through Hawking radiation (very slowly)

## The Supermassive One at Our Galaxy's Center

Sagittarius A* is a supermassive black hole at the center of the Milky Way, about 4 million solar masses. In 2020, we got the first image of it!""",
        "confidence": 0.94,
        "from_web": False,
        "suggestions": [
            "What is Hawking radiation?",
            "How was the first black hole image taken?",
            "What happens if you fall into a black hole?",
            "Tell me about neutron stars"
        ]
    },

    "dna": {
        "patterns": ["dna", "deoxyribonucleic acid", "dna structure", "dna replication"],
        "answer": """# 🧬 DNA (Deoxyribonucleic Acid)

DNA is the molecule that carries genetic instructions for life. It's found in almost every cell and contains the blueprint for building and maintaining organisms.

## Structure

**Double Helix:**
- Two complementary strands twisted together
- Connected by base pairs
- Discovered by Watson, Crick, Franklin, and Wilkins (1953)

**Components:**
1. **Deoxyribose:** Sugar backbone
2. **Phosphate groups:** Link sugar molecules
3. **Nitrogenous bases:** A, T, G, C

## Base Pairing

- **Adenine (A)** pairs with **Thymine (T)** - 2 hydrogen bonds
- **Guanine (G)** pairs with **Cytosine (C)** - 3 hydrogen bonds
- This is "complementary base pairing"

## Key Functions

1. **Store genetic information** - Contains all instructions for life
2. **Replication** - Copies itself before cell division
3. **Protein synthesis** - Instructions are transcribed to RNA, then translated to proteins
4. **Inheritance** - Passed from parents to offspring

## Replication Process

1. DNA helicase unwinds the double helix
2. DNA polymerase reads each strand
3. New complementary strands are synthesized
4. Result: Two identical DNA molecules

## Genes

- A gene is a segment of DNA that codes for a specific protein
- Humans have about 20,000-25,000 genes
- These genes determine our traits (height, eye color, etc.)

## Fun Facts

- If you stretched all DNA in your body end-to-end, it would reach the sun and back 100+ times!
- 99.9% of human DNA is identical between people""",
        "confidence": 0.95,
        "from_web": False,
        "suggestions": [
            "What is RNA and how is it different from DNA?",
            "How do genetic mutations occur?",
            "What is CRISPR gene editing?",
            "Explain heredity and genetics"
        ]
    },

    # ============================================================
    # TECHNOLOGY & AI
    # ============================================================

    "what_is_ai": {
        "patterns": ["what is ai", "what is artificial intelligence", "ai definition", "define artificial intelligence", "artificial intelligence"],
        "answer": """# 🤖 Artificial Intelligence (AI)

AI is the simulation of human intelligence in machines. These machines are programmed to think, learn, and make decisions like humans.

## Main Types of AI

**By Level of Intelligence:**
- **Narrow AI** - Designed for specific tasks (ChatGPT, Siri, AlphaGo). This is what exists today.
- **General AI** - Would be equally intelligent across any task. Still theoretical.
- **Super AI** - Would surpass human intelligence. Still speculative.

**By Technology:**
- **Machine Learning** - Systems learn from data
- **Deep Learning** - Neural networks with multiple layers
- **Natural Language Processing** - Understanding human language
- **Computer Vision** - Understanding images
- **Robotics** - Physical AI systems

## How Machine Learning Works

1. **Collect Data** - Gather examples and information
2. **Train Model** - System learns patterns from data
3. **Test Model** - Check accuracy on new data
4. **Deploy** - Use in real applications
5. **Improve** - Continuously refine

## Real-World Applications

| Area | Example |
|------|---------|
| **Healthcare** | Disease diagnosis, drug discovery |
| **Transportation** | Self-driving cars, traffic prediction |
| **Finance** | Fraud detection, algorithmic trading |
| **Entertainment** | Netflix recommendations, game AI |
| **Language** | ChatGPT, Google Translate |
| **Vision** | Facial recognition, image classification |

## Neural Networks

Inspired by how the brain works. Layers of interconnected "neurons" that process information.

**Types:**
- Convolutional (images)
- Recurrent (sequences, text)
- Transformer (language - used in ChatGPT!)

## What's Different About LLMs?

Large Language Models (like me!) are:
- Trained on billions of words of text
- Use transformer architecture
- Predict next word based on context
- Fine-tuned to be helpful, harmless, honest

## Current Limitations

- No true understanding (pattern matching)
- Can make mistakes (hallucinations)
- No common sense like humans
- Needs lots of training data
- Can reflect biases in training data

## The Future

- More efficient models
- Better reasoning abilities
- Multimodal AI (text, image, audio, video)
- AI agents that take actions
- Integration with robotics""",
        "confidence": 0.96,
        "from_web": False,
        "suggestions": [
            "How does machine learning work?",
            "What are neural networks?",
            "Tell me about ChatGPT and LLMs",
            "What is the future of AI?"
        ]
    },

    "machine_learning": {
        "patterns": ["machine learning", "ml", "supervised learning", "unsupervised learning"],
        "answer": """# 🧠 Machine Learning

Machine learning is a subset of AI where systems learn patterns from data without being explicitly programmed for every scenario.

## Three Main Types

### 1. Supervised Learning
**Learning from labeled examples**
- You provide input AND correct output
- System learns the mapping between them
- Used for: prediction, classification

**Examples:**
- Email spam detection (labeled as spam/not spam)
- Image recognition (labeled as "dog", "cat", etc.)
- Price prediction (given features, predict price)

**Algorithms:** Linear Regression, Decision Trees, SVM, Neural Networks

### 2. Unsupervised Learning
**Learning patterns without labels**
- You provide input data only
- System finds hidden patterns
- Used for: clustering, dimensionality reduction

**Examples:**
- Customer segmentation (group similar customers)
- Anomaly detection (find unusual patterns)
- Recommendation systems (group similar items)

**Algorithms:** K-Means, Hierarchical Clustering, PCA

### 3. Reinforcement Learning
**Learning through rewards and penalties**
- Agent takes actions in environment
- Gets rewards for good actions
- Learns to maximize rewards

**Examples:**
- Game AI (AlphaGo, chess bots)
- Robotics (learning to walk)
- Autonomous vehicles

**Key Concept:** Exploration vs Exploitation

## The Machine Learning Workflow

```
1. Define Problem
   ↓
2. Collect Data
   ↓
3. Preprocess Data (clean, normalize)
   ↓
4. Feature Engineering (select important features)
   ↓
5. Choose Algorithm
   ↓
6. Train Model
   ↓
7. Evaluate Performance
   ↓
8. Hyperparameter Tuning
   ↓
9. Deploy Model
   ↓
10. Monitor & Maintain
```

## Key Concepts

**Training Set vs Test Set:**
- Training: Data model learns from (80%)
- Testing: Data to evaluate performance (20%)
- If training accuracy > test accuracy = overfitting

**Overfitting:** Model memorizes training data but fails on new data

**Underfitting:** Model is too simple to capture patterns

**Regularization:** Technique to prevent overfitting""",
        "confidence": 0.95,
        "from_web": False,
        "suggestions": [
            "What is deep learning?",
            "Explain neural networks in detail",
            "What is the difference between AI and ML?",
            "How is machine learning used in healthcare?"
        ]
    },

    # ============================================================
    # HISTORY & NOTABLE PEOPLE
    # ============================================================

    "albert_einstein": {
        "patterns": ["albert einstein", "einstein", "theory of relativity", "e=mc2"],
        "answer": """# 👨‍🔬 Albert Einstein (1879-1955)

One of the greatest physicists of all time. Revolutionized our understanding of space, time, gravity, and energy.

## Early Life

- Born in Ulm, Germany
- Showed early interest in mathematics and physics
- Struggled in school but was self-taught
- Emigrated to Switzerland for better education

## Major Contributions

### 1. Special Relativity (1905)
**Key Ideas:**
- Speed of light is constant for all observers
- Time is relative - slows down at high speeds
- Space and time are connected (spacetime)
- **Famous equation: E = mc²**
  - Energy and mass are interchangeable
  - Tiny amount of mass = huge energy
  - Basis for nuclear power and weapons

### 2. General Relativity (1915)
**Key Ideas:**
- Gravity is not a force but curvature of spacetime
- Massive objects bend spacetime around them
- Objects follow curved paths in spacetime
- Explains: black holes, planetary orbits, light bending

## Famous Quotes

"Imagination is more important than knowledge" 
"Life is like riding a bicycle - to keep your balance, you must keep moving"
"The important thing is not to stop questioning"

## Impact

- Changed physics forever
- Led to quantum mechanics development
- Enabled nuclear energy and medicine
- GPS wouldn't work without relativity corrections!
- Became a symbol of genius

## Personal Life

- Won Nobel Prize in Physics (1921) for photoelectric effect, not relativity
- Passionate about peace and civil rights
- Played violin for relaxation
- Known for wild hair and unconventional style
- Died in Princeton, New Jersey""",
        "confidence": 0.95,
        "from_web": False,
        "suggestions": [
            "Tell me more about the Theory of Relativity",
            "What is E=mc² and why is it important?",
            "How did Einstein win the Nobel Prize?",
            "Tell me about Marie Curie"
        ]
    },

    "marie_curie": {
        "patterns": ["marie curie", "curie", "radioactivity", "polonium", "radium"],
        "answer": """# 👩‍🔬 Marie Curie (1867-1934)

First woman to win a Nobel Prize. Only person to win Nobel Prizes in two different sciences. Pioneer of radioactivity research.

## Achievements

### First Female Nobel Prize Winner (1903)
- Shared Physics Nobel with Pierre Curie and Henri Becquerel
- Award for discovery of radioactivity
- Her husband was Pierre Curie (also physicist)

### Second Nobel Prize (1911)
- Won Chemistry Nobel for discovering radium and polonium
- Only person to win Nobels in two sciences
- Still the most notable achievement for many

## Contributions

**Discovery of Radioactivity:**
- Found that radioactivity is atomic property, not molecular
- Discovered two elements: Polonium and Radium
- Developed techniques for measuring radioactivity

**Health Impact:**
- Her research led to X-rays and cancer treatments
- Radiation therapy for cancer treatment
- Medical imaging technology

## Challenges Faced

- As a woman in science, faced discrimination
- Had to move from Poland to Paris for better opportunities
- Could not get academic positions due to gender
- Despite brilliance, was overshadowed by male colleagues

## Tragic End

- Died of aplastic anemia (likely caused by radiation exposure)
- Handled radioactive materials without protection (didn't know dangers)
- Her laboratory notebooks are still too radioactive to handle!
- Legacy: Importance of safety in science

## Legacy

- Inspiration for women in STEM
- Advanced nuclear medicine
- Showed women could be great scientists
- Changed public perception of science""",
        "confidence": 0.94,
        "from_web": False,
        "suggestions": [
            "What is radioactivity?",
            "Tell me about the Nobel Prize",
            "Who are other famous women in science?",
            "Tell me about Albert Einstein"
        ]
    },

    # ============================================================
    # MATH & LOGIC
    # ============================================================

    "mathematics": {
        "patterns": ["mathematics", "math", "mathematical", "numbers"],
        "answer": """# 📐 Mathematics

The study of quantity, structure, space, and change through abstract reasoning and patterns.

## Main Branches

### 1. Arithmetic
- Basic operations: +, -, ×, ÷
- Fractions, decimals, percentages
- Foundation for all mathematics

### 2. Algebra
- Uses variables (x, y, z) to represent unknown quantities
- Solves equations and inequalities
- Used in: physics, engineering, economics

### 3. Geometry
- Study of shapes, sizes, and spatial properties
- Includes: triangles, circles, 3D shapes
- Applications: architecture, design, navigation

### 4. Trigonometry
- Relationships between angles and sides in triangles
- Functions: sine, cosine, tangent
- Used in: surveying, navigation, engineering

### 5. Calculus
- Study of change and motion
- **Differential calculus:** rates of change
- **Integral calculus:** accumulation
- Used in: physics, engineering, economics

### 6. Statistics & Probability
- Statistics: analyzing data
- Probability: likelihood of events
- Used in: science, business, medicine

### 7. Linear Algebra
- Study of vectors and matrices
- Essential for: computer graphics, machine learning

## Branches by Application

| Branch | Purpose | Example |
|--------|---------|---------|
| Pure Math | Beauty and logic | Number theory, topology |
| Applied Math | Solve real problems | Engineering, physics |
| Computational | Using computers | Machine learning, algorithms |

## Famous Mathematical Concepts

**Pythagoras Theorem:** a² + b² = c² (for right triangles)

**Prime Numbers:** Numbers only divisible by 1 and themselves

**Golden Ratio:** 1.618... (appears in nature and art)

**Infinity:** No end or beginning

**Zero:** Not always understood (Indian mathematicians invented it)

## Why Math Matters

- Foundation of science and technology
- Develops logical thinking
- Used in: computers, medicine, finance, art
- Explains the universe (physics uses math)
- Powers AI and machine learning

## Famous Mathematicians

- Pythagoras (geometry)
- Euclid (geometry foundations)
- Isaac Newton (calculus, physics)
- Carl Gauss (statistics, number theory)
- Leonhard Euler (prolific across all fields)""",
        "confidence": 0.94,
        "from_web": False,
        "suggestions": [
            "Explain calculus in simple terms",
            "What is the Pythagorean theorem?",
            "How is math used in real life?",
            "Tell me about statistics and probability"
        ]
    },

    # ============================================================
    # BIOLOGY
    # ============================================================

    "evolution": {
        "patterns": ["evolution", "darwin", "natural selection", "adaptation"],
        "answer": """# 🧬 Evolution

The process by which living organisms change and adapt over time. Life on Earth evolved from simpler forms to more complex ones over billions of years.

## Key Concepts

### Natural Selection
- Organisms with advantageous traits survive better
- They pass these traits to offspring
- Over time, beneficial traits become common
- **"Survival of the fittest"** - more accurately, survival of the best-adapted

### Mechanism

1. **Variation:** Individuals have different traits
2. **Inheritance:** Traits are passed to offspring
3. **Selection:** Some traits help survival/reproduction
4. **Time:** Small changes accumulate over millions of years

## Evidence for Evolution

1. **Fossil Record:** Shows progression from simple to complex organisms
2. **Comparative Anatomy:** Similar bone structures in different species
3. **DNA Similarity:** All life shares genetic code; DNA is ~99% similar to chimps
4. **Observed Evolution:** Bacteria develop antibiotic resistance, peppered moths color change
5. **Biogeography:** Similar species on isolated islands (Galápagos finches)

## Timeline of Life

```
4.6 billion years ago: Earth forms
3.8 billion years ago: Life begins (single cells)
2.5 billion years ago: Oxygen atmosphere develops
600 million years ago: Complex multicellular life
500 million years ago: Fish
300 million years ago: Amphibians
200 million years ago: Dinosaurs
65 million years ago: Dinosaurs extinct, mammals rise
2.5 million years ago: Humans appear
```

## Charles Darwin

- Naturalist aboard HMS Beagle (1831-1836)
- Observed finches with different beak shapes in Galápagos
- Published "Origin of Species" (1859)
- Proposed natural selection as mechanism
- Faced religious opposition but changed science forever

## Common Misconceptions

❌ "Humans came from monkeys" → ✅ Humans and apes share common ancestor
❌ "Evolution is about getting better" → ✅ It's about adapting to environment
❌ "Evolution is only a theory" → ✅ Scientific theory with massive evidence
❌ "Evolution is random" → ✅ Random mutations + non-random selection

## Human Evolution

- Humans evolved from ape-like ancestors in Africa
- Key developments: walking upright, larger brain, language
- Homo sapiens emerged ~300,000 years ago
- Modern behavior appeared ~70,000 years ago""",
        "confidence": 0.94,
        "from_web": False,
        "suggestions": [
            "Tell me about human evolution in detail",
            "What is natural selection?",
            "How do fossils form?",
            "What caused the dinosaurs to go extinct?"
        ]
    },

    # ============================================================
    # GEOGRAPHY & ENVIRONMENT
    # ============================================================

    "climate_change": {
        "patterns": ["climate change", "global warming", "greenhouse gas", "carbon", "co2"],
        "answer": """# 🌍 Climate Change

The long-term shift in global temperatures and weather patterns, primarily caused by human activities that increase greenhouse gases in the atmosphere.

## Key Facts

### The Greenhouse Effect

1. **Natural Process:** Greenhouse gases trap heat, keep Earth habitable
2. **Human Enhancement:** We've increased CO₂ by 50% since industrial revolution
3. **Result:** Too much heat trapped = warming

### Temperature Rise

- Pre-industrial: 280 ppm CO₂
- Today: 420+ ppm CO₂
- Global temp: ~1.1°C above pre-industrial (1850-1900)
- Paris Agreement goal: Keep warming under 1.5-2°C

## Main Causes

1. **Burning Fossil Fuels** (71% of emissions)
   - Coal, oil, natural gas for energy
   - Cars, planes, ships transportation

2. **Agriculture** (10%)
   - Methane from livestock
   - Nitrous oxide from fertilizers
   - Land clearing

3. **Industry** (8%)
   - Cement, steel, chemicals
   - Manufacturing processes

4. **Waste** (3%)
   - Decomposing organic matter
   - Landfill methane

## Consequences

**Climate:**
- Temperature extremes (heat waves, cold snaps)
- Irregular precipitation
- Stronger hurricanes, droughts, floods

**Environment:**
- Sea level rise (threatens coastal cities)
- Glacier melting
- Ecosystem disruption
- Species extinction

**Society:**
- Food and water scarcity
- Climate refugees
- Economic impacts
- Health issues

## Solutions

**Mitigation (reduce emissions):**
- Renewable energy (solar, wind, hydro)
- Energy efficiency
- Electric vehicles
- Reforestation

**Adaptation (prepare for impacts):**
- Flood defenses
- Heat-resistant crops
- Climate migration planning

## Scientific Consensus

- 97%+ of climate scientists agree on human-caused climate change
- IPCC: Authoritative body on climate science
- Evidence: Temperature records, ice cores, ocean acidification""",
        "confidence": 0.93,
        "from_web": False,
        "suggestions": [
            "What are renewable energy sources?",
            "How does the greenhouse effect work?",
            "What is the Paris Agreement?",
            "How can individuals reduce their carbon footprint?"
        ]
    },

    # ============================================================
    # HISTORY
    # ============================================================

    "world_war_2": {
        "patterns": ["world war 2", "ww2", "wwii", "world war ii", "nazi", "hitler"],
        "answer": """# 🏛️ World War 2 (1939-1945)

The second global military conflict, the deadliest war in human history, involving most of the world's major powers.

## Causes

1. **Treaty of Versailles Resentment** - Germany felt humiliated
2. **Economic Depression** - 1930s Great Depression
3. **Rise of Dictators** - Hitler (Germany), Mussolini (Italy), Tojo (Japan)
4. **Appeasement** - Western powers didn't stop early aggression
5. **Territorial Expansion** - Japan in Asia, Germany in Europe

## Key Players

**Axis Powers:**
- Nazi Germany (Adolf Hitler)
- Fascist Italy (Benito Mussolini)
- Imperial Japan (Hideki Tojo)

**Allied Powers:**
- Soviet Union (Joseph Stalin)
- United Kingdom (Winston Churchill)
- United States (Franklin D. Roosevelt)
- China (Chiang Kai-shek)
- Others: Canada, Australia, Poland, etc.

## Timeline

| Date | Event |
|------|-------|
| Sept 1939 | Germany invades Poland; War begins |
| 1940 | Germany conquers France; Battle of Britain |
| June 1941 | Germany invades Soviet Union |
| Dec 1941 | Japan attacks Pearl Harbor; US enters war |
| 1942-43 | Turning point: Stalingrad, Midway |
| June 1944 | D-Day: Allied invasion of France |
| May 1945 | Germany surrenders |
| Aug 1945 | US drops atomic bombs on Japan |
| Sept 1945 | Japan surrenders; War ends |

## Atrocities

**Holocaust:**
- Nazi genocide of 6 million Jews
- Also killed: Roma, disabled, political prisoners, homosexuals
- Systematic killing camps
- One of history's greatest horrors

**Other War Crimes:**
- Japanese biological weapons in China
- Rape of Nanking
- Soviet purges
- Civilian bombing campaigns

## Scale

- **Deaths:** 70-85 million (6% of world population)
- **Soldiers:** 25+ million
- **Civilians:** 40+ million
- **Costliest war ever:** Economic devastation
- **Entire cities destroyed**

## Outcome

- Germany and Japan defeated
- Soviet Union emerged as superpower
- United States emerged as superpower
- Nuclear age begins
- United Nations formed
- Cold War begins
- End of European colonialism begins

## Legacy

- United Nations created to prevent future wars
- Nuclear weapons change global politics
- Decolonization of Asia and Africa
- Economic and military superpowers shift
- "Never Again" commitment to preventing genocide
- Nuremberg Trials: War crimes accountability

## Impact Today

- Shape of modern world determined
- Nuclear deterrence strategy
- International law development
- Holocaust remembrance
- Lessons about dangers of authoritarianism""",
        "confidence": 0.94,
        "from_web": False,
        "suggestions": [
            "What caused World War 1?",
            "Tell me about the Holocaust in detail",
            "What was the Cold War?",
            "How did the United Nations form?"
        ]
    },

    # ============================================================
    # ECONOMICS & BUSINESS
    # ============================================================

    "cryptocurrency": {
        "patterns": ["cryptocurrency", "bitcoin", "blockchain", "crypto", "ethereum"],
        "answer": """# 💰 Cryptocurrency

Digital currency that uses cryptography for security. Operates on blockchain technology without need for central banks or governments.

## How It Works

**Blockchain:** Distributed ledger where transactions are recorded in "blocks" linked by cryptography.

**Key Features:**
1. **Decentralized:** No single authority controls it
2. **Transparent:** All transactions recorded and visible
3. **Secure:** Cryptography prevents fraud
4. **Immutable:** Records can't be changed once added
5. **Fast:** Transactions settle quickly (sometimes)

## Major Cryptocurrencies

| Crypto | Created | Purpose |
|--------|---------|---------|
| **Bitcoin** | 2009 | Digital money, store of value |
| **Ethereum** | 2015 | Platform for smart contracts |
| **Stablecoin** | Various | Tied to real currency (like USDC) |
| **Altcoins** | Various | Experimental cryptocurrencies |

## Bitcoin

- First cryptocurrency (2009)
- Created by Satoshi Nakamoto (anonymous)
- Limited supply: Only 21 million bitcoins
- Decentralized: No bank needed
- Highly volatile price

**How it works:**
1. Miners solve complex math problems
2. Verify transactions
3. Add to blockchain
4. Earn bitcoin reward (halves every 4 years)

## Blockchain Applications

Beyond cryptocurrency:
- **Supply chain:** Track products
- **Healthcare:** Medical records
- **Real estate:** Property ownership
- **Contracts:** "Smart contracts" execute automatically
- **Voting:** Transparent elections

## Advantages

✅ Decentralized (no single point of failure)
✅ Secure (cryptography)
✅ Transparent (all transactions visible)
✅ Fast international transfers
✅ Lower fees than banks
✅ Financial inclusion (anyone with internet)

## Disadvantages

❌ Highly volatile prices
❌ Used for illegal activities
❌ Energy intensive (especially Bitcoin)
❌ Scalability issues
❌ Irreversible transactions
❌ Regulatory uncertainty
❌ Can be lost or stolen

## Risks

- Volatility: Price swings of 50%+ in days
- Scams: Fake coins and exchange hacks
- Environmental: Massive energy use
- Regulatory: Governments may restrict

## Current Status

- Market cap: Trillions of dollars
- Mainstream adoption growing
- Central banks exploring digital currencies
- Regulation increasing
- Technology still evolving""",
        "confidence": 0.92,
        "from_web": False,
        "suggestions": [
            "How does Bitcoin mining work?",
            "What are smart contracts?",
            "Is cryptocurrency a good investment?",
            "What is blockchain technology?"
        ]
    },

    # ============================================================
    # PHILOSOPHY & ETHICS
    # ============================================================

    "stoicism": {
        "patterns": ["stoicism", "stoic", "marcus aurelius", "epictetus"],
        "answer": """# 🧘 Stoicism

Ancient philosophical school founded in Athens around 300 BCE. Teaches virtue is the highest good and emphasizes accepting what you cannot control.

## Core Principles

### 1. Virtue is the Highest Good
- Only virtue (wisdom, justice, courage, temperance) truly matters
- External things (wealth, fame, health) don't define happiness
- Internal character is everything

### 2. Dichotomy of Control
**Focus on what's in your control:**
- Your thoughts
- Your actions
- Your judgments
- Your efforts

**Accept what's not:**
- Others' opinions
- External events
- Past events
- Other people's actions

### 3. Living in Accordance with Nature
- Accept the natural order
- Don't fight against reality
- Find your role and fulfill it
- Recognize interconnectedness

### 4. The Goal: Ataraxia
- Freedom from fear and pain
- Through virtue and acceptance
- Not numbness, but wisdom

## Famous Stoics

**Zeno of Citium** (founder)
- Started school in Athens
- Taught in the Stoa (portico)
- "Stoa" → "Stoicism"

**Epictetus** (50-135 CE)
- Former slave
- "It's not things that disturb us, but our judgments"
- Emphasized personal responsibility

**Marcus Aurelius** (121-180 CE)
- Roman Emperor
- Wrote "Meditations"
- Applied stoicism to rule empire
- Practiced what he preached

**Seneca** (4 BCE - 65 CE)
- Roman statesman and writer
- Practiced simplicity
- Focused on wisdom over wealth

## Stoic Exercises

1. **Negative Visualization:** Imagine loss to appreciate what you have
2. **Prosoche:** Mindful attention to thoughts and reactions
3. **Discipline of Assent:** Don't automatically believe your thoughts
4. **Voluntary Discomfort:** Practice enduring hardship

## Modern Application

**Stress Management:**
- Accept what you can't control
- Focus energy on what you can
- Reduces anxiety

**Resilience:**
- Accept challenges as growth opportunities
- Don't be emotionally devastated by setbacks
- Keep perspective

**Decision Making:**
- Focus on virtue and character
- Don't chase external rewards
- Do the right thing regardless of outcome

## Stoicism vs Other Philosophies

| Stoicism | Epicureanism | Buddhism |
|----------|--------------|----------|
| Virtue is highest good | Pleasure is good | End suffering through enlightenment |
| Accept fate | Minimize pain | Understand impermanence |
| Duty and reason | Moderation | Middle path |

## Misconceptions

❌ Stoicism = No emotions → ✅ Stoicism = Wise management of emotions
❌ Stoicism = Suffer silently → ✅ Stoicism = Accept, then act
❌ Stoicism = Fatalism → ✅ Stoicism = Act on what you control

## Relevance Today

- Cognitive Behavioral Therapy uses stoic principles
- Popular in entrepreneurship and sports
- Mental health and resilience training
- Philosophy of acceptance and peace""",
        "confidence": 0.93,
        "from_web": False,
        "suggestions": [
            "Who was Marcus Aurelius?",
            "What is the difference between Stoicism and Buddhism?",
            "How can I apply Stoicism in daily life?",
            "Tell me about Epictetus"
        ]
    },

    # ============================================================
    # PROGRAMMING & COMPUTING
    # ============================================================

    "python_programming": {
        "patterns": ["python", "python programming", "python language", "python code"],
        "answer": """# 🐍 Python Programming Language

High-level, interpreted programming language known for simplicity and readability. One of the most popular languages for beginners and professionals.

## Key Characteristics

✅ **Easy to Learn:** Simple syntax, readable code
✅ **Interpreted:** Run code without compilation
✅ **Dynamic Typing:** Variables don't need type declaration
✅ **Versatile:** Web, data science, AI, automation, scripting
✅ **Large Community:** Tons of libraries and tutorials
✅ **Free and Open Source:** No licensing costs

## Basic Syntax

```python
# Variables and data types
name = "Joshua"
age = 25
gpa = 3.8
is_student = True

# Lists and dictionaries
languages = ["Python", "JavaScript", "Java"]
person = {"name": "Joshua", "age": 25, "city": "Quezon City"}

# Loops
for num in range(1, 6):
    print(num)  # Prints 1 to 5

# Functions
def greet(name):
    return f"Hello, {name}!"

# Conditionals
if age >= 18:
    print("Adult")
else:
    print("Minor")
```

## Why Python is Popular

1. **Data Science:** NumPy, Pandas, Scikit-learn
2. **Machine Learning:** TensorFlow, PyTorch, Keras
3. **Web Development:** Django, Flask, FastAPI
4. **Automation:** Scripts for repetitive tasks
5. **Game Development:** Pygame
6. **Scientific Computing:** SciPy, Matplotlib

## Common Use Cases

| Use Case | Popular Libraries |
|----------|------------------|
| Data Analysis | Pandas, NumPy, Matplotlib |
| Machine Learning | TensorFlow, PyTorch, Scikit-learn |
| Web Development | Django, Flask, FastAPI |
| Web Scraping | BeautifulSoup, Scrapy |
| Automation | Selenium, Schedule |
| Game Development | Pygame |

## Python 2 vs Python 3

- **Python 2:** Old, deprecated (2020)
- **Python 3:** Current, recommended

## Virtual Environments

```bash
# Create
python -m venv venv

# Activate (Mac/Linux)
source venv/bin/activate

# Activate (Windows)
venv\\Scripts\\activate

# Install packages
pip install package_name
```

## Popular Frameworks

**Django:** Full-featured web framework
**Flask:** Lightweight web framework
**FastAPI:** Modern, fast API framework
**Django REST Framework:** Building APIs

## Best Practices

1. **Follow PEP 8:** Style guide for Python
2. **Use Virtual Environments:** Isolate projects
3. **Document Code:** Write clear comments
4. **Test Code:** Write unit tests
5. **Use Type Hints:** Help catch errors
6. **Avoid Global Variables:** Keep code clean

## Career Opportunities

- Data Scientist
- Machine Learning Engineer
- Backend Developer
- DevOps Engineer
- Automation Engineer
- Python Developer

## Learning Path

1. Basics: Variables, loops, functions
2. Data structures: Lists, dicts, sets
3. OOP: Classes, inheritance
4. Libraries: Pandas, NumPy, Matplotlib
5. Web: Flask or Django
6. Advanced: Async, decorators, metaclasses""",
        "confidence": 0.95,
        "from_web": False,
        "suggestions": [
            "What is Django and how does it work?",
            "Python vs JavaScript: which should I learn?",
            "How do I start learning Python?",
            "What are Python's best libraries?"
        ]
    },
}

# ============================================================
# PART 2: HELPER FUNCTIONS
# ============================================================

def summarize_question(question: str) -> str:
    """Clean and summarize the user's question"""
    summary = question.strip()
    
    prefixes = [
        "can you ", "could you ", "please ", "what is ", "who is ", "tell me about ",
        "explain ", "define ", "what are ", "what does ", "how does ", "how do ",
        "why is ", "why does ", "can i ", "should i ", "is it true that "
    ]
    
    for prefix in prefixes:
        if summary.lower().startswith(prefix):
            summary = summary[len(prefix):].strip()
            break
    
    return summary.capitalize()

def find_best_match(question: str) -> Tuple[Optional[str], float]:
    """
    Find the best knowledge base match for a question.
    Returns (answer, confidence) or (None, 0) if no good match.
    """
    q_lower = question.lower().strip()
    best_match = None
    best_score = 0.3  # Minimum confidence threshold
    
    for topic, data in AI_KNOWLEDGE.items():
        for pattern in data.get("patterns", []):
            # Check for pattern match
            pattern_lower = pattern.lower()
            
            # Exact match at start or as a whole word in middle
            if q_lower.startswith(pattern_lower) or re.search(r'\b' + re.escape(pattern_lower) + r'\b', q_lower):
                score = data.get("confidence", 0.8)
                if score > best_score:
                    best_score = score
                    best_match = topic
    
    if best_match:
        return best_match, best_score
    return None, 0

def should_search_web(question: str, from_knowledge: bool) -> bool:
    """
    Determine if we should search the web.
    Search if:
    1. No knowledge base match found
    2. Question is time-sensitive (even if match exists)
    """
    time_sensitive = [
        "latest", "today", "current", "breaking", "update", "news",
        "weather", "2024", "2025", "2026", "now", "recent", "price", "stock",
        "score", "yesterday", "this week", "this month", "headlines", "live"
    ]
    
    q_lower = question.lower()
    
    # If we have knowledge match AND no time-sensitive keywords, don't search
    if from_knowledge:
        is_time_sensitive = any(keyword in q_lower for keyword in time_sensitive)
        return is_time_sensitive  # Only search if time-sensitive
    
    # No knowledge match - search web
    return True

def search_web(query: str, max_results: int = 5) -> List[Dict]:
    """Search the web using DuckDuckGo"""
    try:
        cleaned_query = summarize_question(query)
        print(f"🔍 Searching web for: {cleaned_query}")
        
        with DDGS() as ddgs:
            results = list(ddgs.text(cleaned_query, max_results=max_results))
        
        if not results:
            return []
        
        formatted_results = []
        for r in results:
            formatted_results.append({
                'title': r.get('title', 'No title'),
                'url': r.get('href', '#'),
                'snippet': r.get('body', 'No description available'),
                'source': r.get('href', '').split('/')[2] if r.get('href') else 'Unknown'
            })
        
        print(f"✅ Found {len(formatted_results)} results")
        return formatted_results
    
    except Exception as e:
        print(f"❌ Search error: {e}")
        return []

def format_answer_with_sources(query: str, results: List[Dict]) -> tuple:
    """Format web search results with sources"""
    if not results:
        return f"I searched the web for '{summarize_question(query)}' but couldn't find relevant information.", []
    
    answer_parts = [f"Based on my web search for: **{summarize_question(query)}**\n"]
    
    for i, result in enumerate(results[:3], 1):
        snippet = result['snippet']
        source_name = result['source'].replace('www.', '')
        answer_parts.append(f"\n**Source {i}: {result['title']}** ({source_name})")
        answer_parts.append(f"\n{snippet[:250]}...")
    
    answer_parts.append("\n\n---\n")
    answer_parts.append("\n📚 **All Sources:**")
    for result in results:
        answer_parts.append(f"\n• [{result['title']}]({result['url']})")
    
    return ''.join(answer_parts), results

def generate_suggestions(query: str, results: Optional[List[Dict]] = None) -> List[str]:
    """Generate contextual follow-up suggestions for web search results"""
    cleaned = summarize_question(query)
    suggestions = [
        f"Tell me more about {cleaned}",
        f"What are the latest developments in {cleaned}?",
        f"Why is {cleaned} important?",
        f"How does {cleaned} affect everyday life?"
    ]
    return suggestions[:4]

# ============================================================
# PART 3: MAIN AI RESPONSE ENGINE
# ============================================================

def ai_respond(question: str) -> Dict:
    """
    Main AI brain:
    1. Try to find context in knowledge base
    2. If found AND not time-sensitive → use knowledge base context
    3. If not found OR time-sensitive → search web for context
    4. Call Gemini with context and question
    5. Return best answer with metadata
    """
    
    q_lower = question.lower().strip()
    
    # Step 1: Find best knowledge base match
    best_topic, confidence = find_best_match(question)
    
    # Step 2: Check if time-sensitive
    is_time_sensitive = should_search_web(question, best_topic is not None)
    
    context = ""
    source_type = ""
    sources = []
    suggestions = []
    from_web_search = False
    
    # Step 3: Get context
    if best_topic and not is_time_sensitive:
        data = AI_KNOWLEDGE[best_topic]
        context = data["answer"]
        source_type = "Knowledge Base"
        suggestions = data.get("suggestions", [])
        from_web_search = False
    else:
        if best_topic and is_time_sensitive:
            print(f"⏰ Time-sensitive question detected, searching web for latest: {question}")
        else:
            print(f"📚 Not in knowledge base, searching web for: {question}")
            
        results = search_web(question)
        if results:
            context, sources = format_answer_with_sources(question, results)
            source_type = "Web Search"
            from_web_search = True
            suggestions = generate_suggestions(question, results)
            confidence = 0.85
        elif best_topic:
            data = AI_KNOWLEDGE[best_topic]
            context = f"{data['answer']}\n\n*Note: Web search was unavailable for latest info.*"
            source_type = "Knowledge Base (Web search unavailable)"
            suggestions = data.get("suggestions", [])
            from_web_search = False
            confidence = 0.6
        else:
            context = "No relevant context found."
            source_type = "No Match"
            from_web_search = False
            confidence = 0.2

    # If GEMINI API is missing, fallback to old behavior
    if not GEMINI_API_KEY:
        if context == "No relevant context found.":
            answer = f"I couldn't find information about '{summarize_question(question)}' in my knowledge base or on the web. Could you rephrase your question? (Note: Gemini API Key is missing)"
        else:
            answer = context
        return {
            "answer": answer,
            "sources": sources,
            "confidence": confidence,
            "from_web_search": from_web_search,
            "is_thinking": from_web_search,
            "source_type": source_type,
            "suggestions": suggestions
        }

    # Step 4: Call Gemini
    try:
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=GEMINI_SYSTEM_PROMPT
        )
        prompt = f"Knowledge Base Context:\n{context}\n\nUser Question:\n{question}"
        response = model.generate_content(prompt)
        answer = response.text
        
    except Exception as e:
        answer = f"Error communicating with Gemini AI: {str(e)}\n\nFallback context:\n{context}"
        
    return {
        "answer": answer,
        "sources": sources,
        "confidence": confidence,
        "from_web_search": from_web_search,
        "is_thinking": True,
        "source_type": source_type + " + Gemini AI",
        "suggestions": suggestions
    }

# ============================================================
# PART 4: STREAMING SUPPORT
# ============================================================

async def stream_response(answer: str, sources: Optional[List[Dict]] = None) -> AsyncGenerator[str, None]:
    """Stream the response word by word"""
    words = answer.split(' ')
    
    for word in words:
        chunk = {"type": "text", "content": word + " ", "done": False}
        yield f"data: {json.dumps(chunk)}\n\n"
        await asyncio.sleep(0.02)
    
    if sources:
        chunk = {"type": "sources", "content": sources, "done": False}
        yield f"data: {json.dumps(chunk)}\n\n"
    
    chunk = {"type": "done", "content": "Response complete", "done": True}
    yield f"data: {json.dumps(chunk)}\n\n"

# ============================================================
# PART 5: API ENDPOINTS
# ============================================================

@app.get("/")
def root():
    return {
        "name": "AI Chat with Comprehensive Knowledge Base",
        "version": "3.0.0",
        "description": "AI answers from knowledge base first, searches web only when needed",
        "features": [
            "✅ Comprehensive knowledge base (50+ topics)",
            "✅ Intelligent fallback to web search",
            "✅ Time-sensitive query detection",
            "✅ Source attribution",
            "✅ Streaming responses",
            "✅ Real-time indicators"
        ]
    }

@app.get("/health")
def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/chat")
async def chat(message: str = Query(..., min_length=1, description="Your question")):
    """Regular chat endpoint"""
    print(f"📝 Received: {message}")
    response = ai_respond(message)
    
    return {
        "question": message,
        "question_summary": summarize_question(message),
        "answer": response["answer"],
        "sources": response["sources"],
        "confidence": response["confidence"],
        "from_web_search": response["from_web_search"],
        "source_type": response["source_type"],
        "suggestions": response.get("suggestions", []),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/chat-stream")
async def chat_stream(message: str = Query(..., min_length=1, description="Your question")):
    """Streaming chat endpoint"""
    print(f"📝 Received (streaming): {message}")
    response = ai_respond(message)
    
    async def generate():
        # Send metadata
        metadata = {
            "type": "metadata",
            "question": message,
            "question_summary": summarize_question(message),
            "from_web_search": response["from_web_search"],
            "source_type": response["source_type"],
            "done": False
        }
        yield f"data: {json.dumps(metadata)}\n\n"
        
        # Status indicators
        if response["from_web_search"]:
            status = {"type": "status", "status": "🔍 Searching the web...", "done": False}
            yield f"data: {json.dumps(status)}\n\n"
            await asyncio.sleep(0.3)
        else:
            status = {"type": "status", "status": "💭 Using knowledge base...", "done": False}
            yield f"data: {json.dumps(status)}\n\n"
            await asyncio.sleep(0.2)
        
        # Stream answer
        answer = response["answer"]
        chunks = answer.split(' ')
        
        for chunk in chunks:
            text_chunk = {"type": "text", "content": chunk + " ", "done": False}
            yield f"data: {json.dumps(text_chunk)}\n\n"
            await asyncio.sleep(0.01)
        
        # Sources
        if response["sources"]:
            sources_chunk = {"type": "sources", "sources": response["sources"], "done": False}
            yield f"data: {json.dumps(sources_chunk)}\n\n"
        
        # Suggestions
        if response.get("suggestions"):
            suggestions_chunk = {"type": "suggestions", "suggestions": response["suggestions"], "done": False}
            yield f"data: {json.dumps(suggestions_chunk)}\n\n"
        
        # Done
        done_chunk = {
            "type": "done",
            "confidence": response["confidence"],
            "source_type": response["source_type"],
            "done": True
        }
        yield f"data: {json.dumps(done_chunk)}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)