import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import json
import google.generativeai as genai
from PyPDF2 import PdfReader
from io import BytesIO

# Page config
st.set_page_config(
    page_title="VMFS Dashboard",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main { padding: 0rem 1rem; }
    .stTabs [data-baseweb="tab-list"] { gap: 24px; }
    .stTabs [data-baseweb="tab"] { 
        height: 50px; 
        padding: 0px 24px;
        background-color: #f0f2f6;
        border-radius: 8px;
    }
    .metric-card { 
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
</style>
""", unsafe_allow_html=True)

# Load data
@st.cache_data
def load_vmfs_data():
    mechanisms = [
        {
            "id": "m1",
            "name": "Compute Monitoring",
            "scores": {"technical": 3.5, "political": 2.5, "sovereignty": 2.0, "globalSouth": 2.5, "weighted": 2.6},
            "definition": "Uses secure hardware features in AI chips to meter training workloads."
        },
        {
            "id": "m2",
            "name": "Chip Registry",
            "scores": {"technical": 3.0, "political": 3.0, "sovereignty": 3.0, "globalSouth": 3.0, "weighted": 3.0},
            "definition": "Advanced AI accelerators receive unique identifiers and all sales are logged."
        },
        {
            "id": "m3",
            "name": "TEE Attestation",
            "scores": {"technical": 4.2, "political": 2.8, "sovereignty": 3.5, "globalSouth": 2.0, "weighted": 3.1},
            "definition": "Cryptographically prove properties of training/inference runs using secure enclaves."
        },
        {
            "id": "m4",
            "name": "Third-Party Audits",
            "scores": {"technical": 4.5, "political": 4.0, "sovereignty": 3.0, "globalSouth": 3.5, "weighted": 3.8},
            "definition": "Independent experts gain structured access to models to evaluate safety claims."
        },
        {
            "id": "m5",
            "name": "Model Watermarking",
            "scores": {"technical": 2.5, "political": 3.5, "sovereignty": 4.5, "globalSouth": 4.0, "weighted": 3.6},
            "definition": "Embed imperceptible signals into AI outputs to trace content back to models."
        },
        {
            "id": "m6",
            "name": "Whistleblower Programs",
            "scores": {"technical": 4.0, "political": 3.0, "sovereignty": 4.0, "globalSouth": 4.5, "weighted": 3.9},
            "definition": "Incentivize and protect employees to report undisclosed AI development."
        },
        {
            "id": "m7",
            "name": "Remote Sensing",
            "scores": {"technical": 3.5, "political": 4.5, "sovereignty": 5.0, "globalSouth": 3.5, "weighted": 4.1},
            "definition": "Use satellites to detect heat signatures from large AI data centers."
        },
        {
            "id": "m8",
            "name": "Declaration Regimes",
            "scores": {"technical": 4.0, "political": 4.0, "sovereignty": 3.0, "globalSouth": 2.5, "weighted": 3.4},
            "definition": "Require developers to self-report training runs and model releases."
        },
        {
            "id": "m9",
            "name": "Blockchain Registry",
            "scores": {"technical": 3.8, "political": 2.0, "sovereignty": 3.5, "globalSouth": 2.8, "weighted": 3.0},
            "definition": "Distributed ledger recording immutable metadata for all frontier models."
        }
    ]
    return pd.DataFrame(mechanisms)

df = load_vmfs_data()

# Sidebar
with st.sidebar:
    st.title("🔍 VMFS Dashboard")
    st.markdown("**Verification Mechanism Feasibility Scorer**")
    st.markdown("---")
    
    page = st.radio(
        "Navigate",
        ["Home", "Dashboard", "Treaty Advisor", "Portfolio", "Framework"],
        label_visibility="collapsed"
    )
    
    st.markdown("---")
    st.caption("Track 4: International Verification & Coordination Infrastructure")

# HOME PAGE
if page == "Home":
    st.title("Verification Mechanism Feasibility Scorer")
    
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Mechanisms", len(df))
    with col2:
        st.metric("Avg Feasibility", f"{df['scores'].apply(lambda x: x['weighted']).mean():.1f}")
    with col3:
        st.metric("Top Score", f"{df['scores'].apply(lambda x: x['weighted']).max():.1f}")
    with col4:
        st.metric("Objects of Verification", "4")
    
    st.markdown("---")
    
    st.subheader("About VMFS")
    st.write("""
    A systematic framework for evaluating AI governance verification mechanisms 
    across technical, political, and global adoption dimensions.
    """)
    
    st.subheader("Key Finding")
    st.info("""
    **No Silver Bullet**: No mechanism achieves scores above 4.0 across all dimensions. 
    The highest weighted average is Remote Sensing (4.1), which benefits from being 
    non-intrusive but has limited ability to verify training run properties.
    """)

# DASHBOARD PAGE
elif page == "Dashboard":
    st.title("Interactive Dashboard")
    
    # Mechanism selector
    selected = st.selectbox(
        "Select Mechanism",
        df['name'].tolist(),
        index=0
    )
    
    mech_data = df[df['name'] == selected].iloc[0]
    scores = mech_data['scores']
    
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.subheader("Radar Chart")
        
        # Create radar chart
        categories = ['Technical', 'Political', 'Sovereignty', 'Global South']
        values = [
            scores['technical'],
            scores['political'],
            scores['sovereignty'],
            scores['globalSouth']
        ]
        
        fig = go.Figure()
        fig.add_trace(go.Scatterpolar(
            r=values + [values[0]],
            theta=categories + [categories[0]],
            fill='toself',
            name=selected,
            line_color='#1E40AF'
        ))
        
        fig.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[0, 5])),
            showlegend=False,
            height=400
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        st.metric("Weighted Average", f"{scores['weighted']:.1f}")
    
    with col2:
        st.subheader("Feasibility Matrix")
        
        # Scatter plot
        scatter_data = []
        for _, row in df.iterrows():
            scatter_data.append({
                'name': row['name'],
                'technical': row['scores']['technical'],
                'political': row['scores']['political'],
                'weighted': row['scores']['weighted'],
                'selected': row['name'] == selected
            })
        
        scatter_df = pd.DataFrame(scatter_data)
        
        fig2 = px.scatter(
            scatter_df,
            x='technical',
            y='political',
            size='weighted',
            color='selected',
            hover_name='name',
            labels={'technical': 'Technical Feasibility', 'political': 'Political Tractability'},
            color_discrete_map={True: '#1E40AF', False: '#93C5FD'}
        )
        
        fig2.update_layout(
            showlegend=False,
            height=400,
            xaxis=dict(range=[0, 5]),
            yaxis=dict(range=[0, 5])
        )
        
        st.plotly_chart(fig2, use_container_width=True)
    
    st.markdown("---")
    st.subheader("Definition")
    st.write(mech_data['definition'])

# TREATY ADVISOR PAGE
elif page == "Treaty Advisor":
    st.title("🤖 Treaty Advisor")
    st.write("Upload a treaty or policy document to get AI-powered mechanism recommendations.")
    
    # API key check
    if 'GOOGLE_API_KEY' not in st.secrets:
        st.error("⚠️ Google API key not configured. Add GOOGLE_API_KEY to Streamlit secrets.")
        st.stop()
    
    uploaded_file = st.file_uploader(
        "Upload Document",
        type=['txt', 'pdf', 'docx'],
        help="Upload a treaty or policy document"
    )
    
    if uploaded_file:
        st.success(f"✅ Uploaded: {uploaded_file.name}")
        
        if st.button("🤖 Analyze Document", type="primary"):
            with st.spinner("Analyzing document..."):
                try:
                    # Extract text
                    if uploaded_file.type == "application/pdf":
                        pdf_reader = PdfReader(BytesIO(uploaded_file.read()))
                        text = ""
                        for page in pdf_reader.pages:
                            text += page.extract_text()
                    else:
                        text = uploaded_file.read().decode('utf-8')
                    
                    # Configure Gemini
                    genai.configure(api_key=st.secrets['GOOGLE_API_KEY'])
                    model = genai.GenerativeModel('gemini-1.5-flash')
                    
                    prompt = f"""Analyze this policy document and extract verification requirements.

{text[:15000]}

Return ONLY valid JSON with this structure:
{{
  "requirements": ["requirement 1", "requirement 2"],
  "oovs_needed": ["compute", "lineage", "deployment", "post-training"],
  "priorities": ["technical", "political"],
  "constraints": ["constraint 1"]
}}"""
                    
                    response = model.generate_content(prompt)
                    
                    # Parse response
                    clean_text = response.text.replace('```json', '').replace('```', '').strip()
                    analysis = json.loads(clean_text)
                    
                    # Display requirements
                    st.subheader("📋 Requirements Identified")
                    for req in analysis.get('requirements', [])[:5]:
                        st.write(f"✓ {req}")
                    
                    # Show recommendations
                    st.subheader("🎯 Recommended Mechanisms")
                    
                    # Simple scoring based on weighted avg
                    top_mechanisms = df.nlargest(3, lambda x: x['scores']['weighted'])
                    
                    for i, (_, mech) in enumerate(top_mechanisms.iterrows()):
                        with st.expander(f"{'🥇' if i==0 else '🥈' if i==1 else '🥉'} {mech['name']} (Score: {mech['scores']['weighted']:.1f})"):
                            st.write(mech['definition'])
                            st.metric("Feasibility Score", f"{mech['scores']['weighted']:.1f}/5.0")
                
                except Exception as e:
                    st.error(f"Analysis failed: {str(e)}")
    else:
        st.info("💡 Upload a treaty document to get started")

# PORTFOLIO PAGE
elif page == "Portfolio":
    st.title("Portfolio Builder")
    
    st.write("Select mechanisms to build a custom verification portfolio:")
    
    selected_mechanisms = st.multiselect(
        "Choose Mechanisms",
        df['name'].tolist(),
        default=[]
    )
    
    if selected_mechanisms:
        portfolio_df = df[df['name'].isin(selected_mechanisms)]
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Portfolio Summary")
            avg_score = portfolio_df['scores'].apply(lambda x: x['weighted']).mean()
            st.metric("Average Feasibility", f"{avg_score:.2f}")
            st.metric("Mechanisms Selected", len(selected_mechanisms))
        
        with col2:
            st.subheader("Score Distribution")
            scores = portfolio_df['scores'].apply(lambda x: x['weighted']).tolist()
            names = portfolio_df['name'].tolist()
            
            fig = go.Figure(data=[
                go.Bar(x=names, y=scores, marker_color='#1E40AF')
            ])
            fig.update_layout(height=300, yaxis_range=[0, 5])
            st.plotly_chart(fig, use_container_width=True)

# FRAMEWORK PAGE
elif page == "Framework":
    st.title("The VMFS Framework")
    
    st.subheader("Methodology")
    st.write("""
    VMFS provides a structured methodology for evaluating different verification mechanisms 
    that can be used to ensure AI systems are developed and deployed safely.
    """)
    
    st.subheader("Scoring Dimensions")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Technical Feasibility (TF)**")
        st.write("Can this mechanism be implemented with current technology?")
        
        st.markdown("**Political Tractability (PT)**")
        st.write("Can this mechanism gain political support and adoption?")
    
    with col2:
        st.markdown("**Sovereignty Impact (SI)**")
        st.write("How does this affect national sovereignty and autonomy?")
        
        st.markdown("**Global South Adoptability (GSA)**")
        st.write("Can developing nations effectively adopt this mechanism?")
    
    st.markdown("---")
    
    st.subheader("Objects of Verification")
    
    oovs = [
        ("Compute Use", "Verifying the scale and nature of compute used for training"),
        ("Model Lineage", "Verifying a model's provenance and transformations"),
        ("Deployment", "Verifying how and where a model is deployed"),
        ("Post-Training", "Verifying material changes after initial training")
    ]
    
    for name, desc in oovs:
        st.markdown(f"**{name}**: {desc}")

st.markdown("---")
st.caption("VMFS Dashboard | Track 4: International Verification & Coordination Infrastructure")