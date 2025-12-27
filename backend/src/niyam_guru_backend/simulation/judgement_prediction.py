# LangChain + Google Gemini imports
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.prompts import PromptTemplate
from langchain_classic.chains.retrieval_qa.base import RetrievalQA
from supabase import create_client, Client

# Import configuration from settings
from niyam_guru_backend.config import (
    EMBEDDING_MODEL,
    LLM_MODEL,
    VECTORSTORE_DIR,
    SIMULATION_DIR,
    DATA_DIR,
    SUPABASE_URL,
    SUPABASE_KEY,
)

# Path to the Consumer Protection Act 2019 PDF
CPA_2019_PDF_PATH = DATA_DIR / "laws" / "cpa2019.pdf"


def load_cpa_2019_context() -> str:
    """Load and return the Consumer Protection Act 2019 PDF content."""
    if not CPA_2019_PDF_PATH.exists():
        print(f"⚠️ Warning: CPA 2019 PDF not found at {CPA_2019_PDF_PATH}")
        return ""
    
    try:
        loader = PyPDFLoader(str(CPA_2019_PDF_PATH))
        documents = loader.load()
        
        # Combine all pages into a single text
        full_text = "\n\n".join([doc.page_content for doc in documents])
        
        # Truncate if too long (to avoid token limits) - keep first ~50,000 chars
        max_chars = 50000
        if len(full_text) > max_chars:
            full_text = full_text[:max_chars] + "\n\n[... Document truncated for length ...]"
        
        print(f"✅ Loaded CPA 2019 ({len(documents)} pages, {len(full_text)} characters)")
        return full_text
    except Exception as e:
        print(f"⚠️ Error loading CPA 2019 PDF: {e}")
        return ""


def get_vectorstore():
    """Load and return the vector store."""
    embeddings = GoogleGenerativeAIEmbeddings(model=EMBEDDING_MODEL)
    vectorstore = Chroma(
        persist_directory=str(VECTORSTORE_DIR),
        embedding_function=embeddings
    )
    return vectorstore


def get_qa_chain(vectorstore, cpa_context: str = ""):
    """Create and return the QA chain with JSON-formatted legal judgment prompt."""
    
    # Create a retriever from the loaded vector store
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    
    # Initialize the LLM
    llm = ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        temperature=0.3
    )
    
    # Build the CPA 2019 reference section
    cpa_section = ""
    if cpa_context:
        cpa_section = f"""
═══════════════════════════════════════════════════════════════════════════════
                    CONSUMER PROTECTION ACT, 2019 (REFERENCE)
═══════════════════════════════════════════════════════════════════════════════

The following is the full text of the Consumer Protection Act, 2019. Use this as your
PRIMARY LEGAL REFERENCE for identifying applicable sections, definitions, rights,
remedies, and procedures. Quote specific sections when relevant.

{cpa_context}

═══════════════════════════════════════════════════════════════════════════════
"""
    
    # Custom prompt template for legal judgment prediction with JSON output
    legal_judgment_prompt = PromptTemplate(
        input_variables=["context", "question"],
        template='''You are an expert legal analyst specializing in Indian Consumer Protection law.
Your task is to analyze the user's case, predict the likely legal outcome based on similar past cases,
and format your response as a detailed JSON structure for a courtroom simulation.

''' + cpa_section + '''
═══════════════════════════════════════════════════════════════════════════════
                    SIMILAR PAST CASES FROM DATABASE
═══════════════════════════════════════════════════════════════════════════════

{context}

═══════════════════════════════════════════════════════════════════════════════
                    USER'S CURRENT CASE
═══════════════════════════════════════════════════════════════════════════════

{question}

═══════════════════════════════════════════════════════════════════════════════
                    INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

1. Carefully analyze the user's case against the Consumer Protection Act, 2019 provisions above.
2. Identify SPECIFIC sections from CPA 2019 that are applicable (e.g., Section 2(1), Section 35, etc.)
3. Quote the exact text of relevant sections where appropriate.
4. Compare with similar past cases from the database.
5. Provide a detailed judgment prediction.

Analyze the case thoroughly and respond with ONLY a valid JSON object (no markdown, no code blocks, just raw JSON).
The JSON must follow this exact structure:

{{
    "Case_Summary": {{
        "Title": "<Generated case title based on parties involved>",
        "Case_Type": "<e.g., Deficiency in Service, Product Liability, Unfair Trade Practice>",
        "Consumer_Details": {{
            "Description": "<Brief description of the consumer/complainant>",
            "Claim_Amount": "<Amount claimed or product value>",
            "Key_Grievances": ["<List of main complaints>"]
        }},
        "Opposite_Party_Details": {{
            "Description": "<Brief description of the seller/service provider>",
            "Defense_Arguments": ["<List of defense arguments raised or likely to be raised>"]
        }},
        "Facts_of_Case": ["<Chronological list of key facts>"],
        "Evidence_Available": ["<List of evidence the consumer has>"],
        "Evidence_Missing": ["<List of evidence that would strengthen the case>"]
    }},
    "Legal_Grounds": {{
        "Applicable_Sections": [
            {{
                "Section": "<Section number, e.g., 2(1)(g)>",
                "Act": "<Full act name, e.g., Consumer Protection Act, 2019>",
                "Description": "<What this section covers>",
                "Relevance_to_Case": "<How it applies to this specific case>"
            }}
        ],
        "Precedents_Cited": [
            {{
                "Case_Name": "<Full case citation>",
                "Year": "<Year of judgment>",
                "Court": "<Court name>",
                "Key_Holding": "<Main principle established>",
                "Relevance": "<How it supports the current case>"
            }}
        ],
        "Legal_Principles": ["<Key legal principles applicable>"],
        "Contextual_Notes": "<Additional legal context for the simulation>"
    }},
    "Judgment_Reasoning": {{
        "Issues_Framed": [
            {{
                "Issue_Number": <1, 2, 3...>,
                "Issue": "<Legal question to be decided>",
                "Analysis": "<Detailed analysis of this issue>",
                "Finding": "<Conclusion on this issue>"
            }}
        ],
        "Findings": "<Overall findings summary>",
        "Key_Evidence": ["<Evidence that influenced the decision>"],
        "Evidence_Analysis": {{
            "Consumer_Evidence_Strength": "<Strong/Moderate/Weak>",
            "Opposite_Party_Defense_Strength": "<Strong/Moderate/Weak>",
            "Critical_Gaps": ["<Any gaps in evidence or arguments>"]
        }},
        "Inference": "<Legal inference drawn from facts and law>",
        "Liability_Status": "<Established/Not Established/Partial>",
        "Liability_Confidence": "<Percentage confidence, e.g., 85%>",
        "Reasoning_Chain": ["<Step-by-step logical reasoning>"]
    }},
    "Relief_Granted": {{
        "Primary_Relief": {{
            "Type": "<Refund/Replacement/Compensation/Service Rectification>",
            "Amount": "<Specific amount if applicable>",
            "Description": "<Details of the relief>"
        }},
        "Additional_Relief": [
            {{
                "Type": "<e.g., Mental Agony Compensation, Litigation Costs>",
                "Amount": "<Amount if applicable>",
                "Justification": "<Why this relief is appropriate>"
            }}
        ],
        "Predicted_Outcomes": [
            {{
                "Relief": "<Type of outcome>",
                "Confidence": "<Percentage with range, e.g., 78% [70-85]>",
                "Probability_Assessment": "<High/Medium/Low>"
            }}
        ],
        "Total_Compensation_Range": {{
            "Minimum": "<Lower estimate>",
            "Maximum": "<Upper estimate>",
            "Most_Likely": "<Expected amount>"
        }},
        "Time_Frame": "<Expected duration for case resolution>",
        "Recommended_Forum": "<District Forum/State Commission/National Commission>",
        "Recommended_Action": "<Specific next steps for the consumer>"
    }},
    "Simulation_Metadata": {{
        "Case_Strength": "<Strong/Moderate/Weak>",
        "Success_Probability": "<Percentage>",
        "Key_Arguments_For_Consumer": ["<Main arguments consumer should make>"],
        "Key_Arguments_For_Opposite_Party": ["<Main counter-arguments>"],
        "Critical_Moments": ["<Key points where the case could turn>"],
        "Suggested_Witnesses": ["<Types of witnesses that could help>"],
        "Documentary_Evidence_Required": ["<Documents needed for trial>"],
        "Estimated_Hearing_Duration": "<Time estimate>",
        "Complexity_Level": "<Simple/Moderate/Complex>",
        "Similar_Cases_Referenced": ["<List of similar case names from context>"]
    }}
}}

Ensure all fields are populated with detailed, realistic information suitable for a courtroom simulation.
The response must be valid JSON that can be parsed directly.'''
    )
    
    # Create the RetrievalQA chain with custom prompt
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        return_source_documents=True,
        chain_type_kwargs={"prompt": legal_judgment_prompt}
    )
    
    return qa_chain


def get_supabase_client() -> Optional[Client]:
    """Initialize and return the Supabase client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("⚠️ Warning: Supabase credentials not configured. Data will only be saved locally.")
        return None
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return supabase
    except Exception as e:
        print(f"⚠️ Error initializing Supabase client: {e}")
        return None


def save_to_supabase(
    supabase: Client,
    json_data: dict,
    query: str,
    user_id: Optional[str] = None,
    cpa_included: bool = False
) -> Optional[str]:
    """
    Save the judgment prediction to Supabase.
    
    Args:
        supabase: Supabase client instance
        json_data: The parsed judgment prediction JSON
        query: Original user query
        user_id: Optional user ID (UUID) for associating with a user
        cpa_included: Whether CPA 2019 was included in the context
        
    Returns:
        The ID of the created record, or None if failed
    """
    try:
        # Extract key fields from JSON for easier querying
        case_summary = json_data.get("Case_Summary", {})
        judgment_reasoning = json_data.get("Judgment_Reasoning", {})
        relief_granted = json_data.get("Relief_Granted", {})
        simulation_metadata = json_data.get("Simulation_Metadata", {})
        compensation_range = relief_granted.get("Total_Compensation_Range", {})
        
        # Prepare the record
        record = {
            "user_query": query,
            "case_title": case_summary.get("Title"),
            "case_type": case_summary.get("Case_Type"),
            "claim_amount": case_summary.get("Consumer_Details", {}).get("Claim_Amount"),
            "consumer_description": case_summary.get("Consumer_Details", {}).get("Description"),
            "opposite_party_description": case_summary.get("Opposite_Party_Details", {}).get("Description"),
            "case_strength": simulation_metadata.get("Case_Strength"),
            "success_probability": simulation_metadata.get("Success_Probability"),
            "liability_status": judgment_reasoning.get("Liability_Status"),
            "recommended_forum": relief_granted.get("Recommended_Forum"),
            "compensation_minimum": compensation_range.get("Minimum"),
            "compensation_maximum": compensation_range.get("Maximum"),
            "compensation_most_likely": compensation_range.get("Most_Likely"),
            "prediction_json": json_data,
            "cpa_2019_included": cpa_included,
        }
        
        # Add user_id if provided
        if user_id:
            record["user_id"] = user_id
        
        # Insert into Supabase
        result = supabase.table("judgment_predictions").insert(record).execute()
        
        if result.data and len(result.data) > 0:
            record_id = result.data[0].get("id")
            print(f"✅ Judgment prediction saved to Supabase with ID: {record_id}")
            return record_id
        else:
            print("⚠️ Warning: Insert succeeded but no data returned")
            return None
            
    except Exception as e:
        print(f"⚠️ Error saving to Supabase: {e}")
        return None


def save_simulation_json(json_data: dict, query: str) -> Path:
    """Save the simulation JSON to a timestamped folder."""
    # Create timestamp-based folder name
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    session_folder = SIMULATION_DIR / timestamp
    session_folder.mkdir(parents=True, exist_ok=True)
    
    # Save the judgment prediction JSON
    json_file = session_folder / "judgment_prediction.json"
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(json_data, f, indent=2, ensure_ascii=False)
    
    # Also save the original query for reference
    query_file = session_folder / "user_query.txt"
    with open(query_file, "w", encoding="utf-8") as f:
        f.write(query)
    
    return json_file


def parse_llm_response(response_text: str) -> dict:
    """Parse the LLM response text into a JSON object."""
    # Try to extract JSON from the response
    text = response_text.strip()
    
    # Remove markdown code blocks if present
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    
    text = text.strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # If parsing fails, return an error structure
        return {
            "error": "Failed to parse LLM response as JSON",
            "parse_error": str(e),
            "raw_response": response_text
        }


def run_judgment_prediction(
    query: str,
    user_id: Optional[str] = None,
    save_to_db: bool = True
) -> tuple[dict, Path, Optional[str]]:
    """
    Run the judgment prediction pipeline and save results.
    
    Args:
        query: The user's case description
        user_id: Optional user ID (UUID) for associating prediction with a user
        save_to_db: Whether to save to Supabase database (default True)
        
    Returns:
        Tuple of (parsed JSON response, path to saved file, Supabase record ID or None)
    """
    print("--- Step 1: Loading Consumer Protection Act 2019 ---")
    cpa_context = load_cpa_2019_context()
    
    print("\n--- Step 2: Loading Existing Vector Database ---")
    vectorstore = get_vectorstore()
    print(f"✅ Database loaded successfully from: '{VECTORSTORE_DIR}'")
    
    print("\n--- Step 3: Setting up the LLM and Retriever ---")
    qa_chain = get_qa_chain(vectorstore, cpa_context)
    print("✅ LLM and retriever are ready.")
    
    print("\n--- Step 4: Running Query ---")
    print(f"Query: {query[:100]}..." if len(query) > 100 else f"Query: {query}")
    
    # Invoke the chain
    response = qa_chain.invoke({"query": query})
    
    # Parse the JSON response
    print("\n--- Step 5: Parsing Response ---")
    json_response = parse_llm_response(response["result"])
    
    # Add source documents metadata to the response
    source_docs = []
    for doc in response.get("source_documents", []):
        source_docs.append({
            "metadata": doc.metadata,
            "content_preview": doc.page_content[:500] if doc.page_content else ""
        })
    json_response["_source_documents"] = source_docs
    json_response["_query"] = query
    json_response["_timestamp"] = datetime.now().isoformat()
    json_response["_cpa_2019_included"] = bool(cpa_context)
    
    # Save to local file
    print("\n--- Step 6: Saving Simulation Data Locally ---")
    saved_path = save_simulation_json(json_response, query)
    print(f"✅ Simulation JSON saved to: {saved_path}")
    
    # Save to Supabase database
    supabase_record_id = None
    if save_to_db:
        print("\n--- Step 7: Saving to Supabase Database ---")
        supabase = get_supabase_client()
        if supabase:
            supabase_record_id = save_to_supabase(
                supabase=supabase,
                json_data=json_response,
                query=query,
                user_id=user_id,
                cpa_included=bool(cpa_context)
            )
            if supabase_record_id:
                # Add Supabase record ID to the local JSON for reference
                json_response["_supabase_id"] = supabase_record_id
    
    return json_response, saved_path, supabase_record_id


# ========== Main Execution ==========
if __name__ == "__main__":
    # Example query
    query = """
A consumer bought a phone that exploded after 1 day of use. The seller refuses to acknowledge the issue, 
blaming the fault on the user's pattern of usage. The consumer has the purchase receipt and photos of the 
damaged phone. The phone was purchased for Rs. 25,000.

What are the chances of winning this case? What compensation can be expected?
"""
    
    # Run the prediction (saves to both local file and Supabase)
    result, saved_file, supabase_id = run_judgment_prediction(query)
    
    # Display results
    print("\n" + "=" * 70)
    print("JUDGMENT PREDICTION (JSON)")
    print("=" * 70)
    
    if "error" in result:
        print(f"Error: {result['error']}")
        print(f"Raw response:\n{result.get('raw_response', 'N/A')}")
    else:
        # Pretty print the main sections
        for section in ["Case_Summary", "Legal_Grounds", "Judgment_Reasoning", "Relief_Granted", "Simulation_Metadata"]:
            if section in result:
                print(f"\n{section}:")
                print(json.dumps(result[section], indent=2))
    
    print("\n" + "=" * 70)
    print(f"Full JSON saved to: {saved_file}")
    if supabase_id:
        print(f"Supabase record ID: {supabase_id}")
    print("=" * 70)