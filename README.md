# RAG_PDF_Chatbot
```markdown
# 🤖 IntellectRAG Engine

IntellectRAG is a high-performance, lightweight Retrieval-Augmented Generation (RAG) web application. It features a blazing-fast **FastAPI** backend coupled with an intuitive **JavaScript** frontend, specifically engineered to handle complex PDF text extractions—including native layouts and Chrome-printed documents—without missing a beat.

---

## 🚀 Key Features

*   **Dual PDF Extraction Engine:** Utilizes `pypdf` for standard documents and seamlessly switches to `PyMuPDF (fitz)` to accurately extract layout-heavy or Chrome-printed PDFs.
*   **Robust Chunking & Fallback Logic:** Intelligent text chunking mechanisms with a robust fallback system that prevents "0 chunks found" runtime errors.
*   **FastAPI Backend Architecture:** Modern, asynchronous Python architecture utilizing LangChain and Groq LLMs for rapid context injection and answering.
*   **Zero-Database In-Memory Store:** Designed for ephemeral serverless deployment, managing current context chunks rapidly via memory streams.
*   **Vercel Serverless Ready:** Pre-configured architecture fully optimized for deployment on Vercel's serverless platform.

---

## 📂 Project Structure

```text
IntellectRAG/
├── api/
│   ├── index.py          # FastAPI application & RAG backend pipeline
│   └── __pycache__/      # Compiled Python files (ignored in Git)
├── public/
│   ├── index.html        # App user interface
│   ├── style.css         # Minimal styling
│   └── app.js            # Frontend API consumer logic
├── .env                  # Local environment configurations (ignored in Git)
├── .gitignore            # Git exclusion rules
├── requirements.txt      # Serverless-optimized dependencies
└── vercel.json           # Vercel deployment & routing config

```

---

## 🛠️ Tech Stack

* **Backend:** FastAPI, Python, LangChain, LangChain-Groq
* **Frontend:** Vanilla JavaScript, HTML5, CSS3
* **PDF Extraction:** PyMuPDF (`fitz`), PyPDF
* **Deployment:** Vercel (Serverless Functions)

---

## 💻 Local Setup Instructions

### 1. Clone the Repository

```bash
git clone [https://github.com/YOUR_USERNAME/IntellectRAG.git](https://github.com/YOUR_USERNAME/IntellectRAG.git)
cd IntellectRAG

```

### 2. Set Up a Virtual Environment

```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On Mac/Linux
source venv/bin/activate

```

### 3. Install Dependencies

```bash
pip install -r requirements.txt

```

### 4. Configure Environment Variables

Create a `.env` file in the root directory and append your API key:

```env
GROQ_API_KEY=your_actual_groq_api_key_here

```

### 5. Run the Application Locally

```bash
uvicorn api.index:app --reload

```

Open `public/index.html` in your browser or serve it locally!

---

## ☁️ Vercel Deployment

This project is streamlined for single-click deployment using the Vercel GitHub Integration:

1. Push this workspace to your GitHub profile.
2. Import the repository inside your **Vercel Dashboard**.
3. Under **Environment Variables**, add `GROQ_API_KEY` with your secret key.
4. Hit **Deploy** and let Vercel orchestrate the serverless infrastructure!

---

Developed with ⚡ by Hassan
