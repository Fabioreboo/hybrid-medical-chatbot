flowchart LR
    classDef centerSystem fill:#1c394d,stroke:#588da8,stroke-width:3px,color:#fff,rx:20px,ry:20px,padding:25px,font-size:20px,font-weight:bold
    classDef sideEntity fill:#0071ff,stroke:none,color:#fff,padding:25px,font-size:20px,font-weight:bold

    User["User"]:::sideEntity
    System["Hybrid Medical Chatbot\n\n(Symptom Detection &\nDatabase Retrieval)"]:::centerSystem
    External["Backend Services\n\n(Groq LLM &\nSQLite KB)"]:::sideEntity

    User -- "Health Questions\nSymptom Input" --> System
    System -- "Medical Explanations\nTreatment Precautions" --> User

    System -- "SQL Queries\nContext Prompts" --> External
    External -- "Structured Facts\nGenerated Text" --> System
