# System Architecture Documentation

This document describes the *actual current implementation* of the AI-powered Smart Equipment Monitoring and Predictive Maintenance system. It supersedes any legacy proposal documentation (which may have referenced KNN, Random Forest, Decision Tree, or SVM algorithms that are not currently used as primary algorithms).

---

## 1. System Architecture Diagram

The system employs a modern, decoupled client-server architecture with an in-memory AI inference engine.

```mermaid
graph TD
    subgraph "Frontend Layer (React + Vite + TailwindCSS + Zustand)"
        UI[User Interface]
        State[Zustand State Management]
        Viz[Recharts / Echarts]
        UI --> State
        UI --> Viz
    end

    subgraph "Backend Layer (FastAPI)"
        API[FastAPI Routers]
        Auth[Authentication Service]
        Sim[Telemetry Simulator / API endpoints]
        
        API --> Auth
        API --> Sim
    end

    subgraph "AI / ML Layer (PyTorch)"
        Pre[TimeSeriesPreprocessor]
        AutoEnc[Transformer Autoencoder]
        Pred[Transformer Predictor]
        Pre --> AutoEnc
        Pre --> Pred
    end

    subgraph "Data Layer (SQLite / SQLAlchemy)"
        ORM[SQLAlchemy ORM]
        DB[(SQLite Database)]
        ORM --> DB
    end

    UI -- HTTP/REST --> API
    Sim -- Tensor Data --> Pre
    AutoEnc -- Anomaly Scores --> Sim
    Pred -- Risk / RUL --> Sim
    API -- Read/Write --> ORM
```

---

## 2. AI Pipeline Architecture

The primary AI pipeline leverages modern deep learning (Transformer architecture) to process time-series data for both anomaly detection and forecasting.

```mermaid
graph LR
    A[Sensor/Historical Data] --> B[Data Preprocessing]
    B --> C[Time-Series Representation]
    C --> D[Transformer AI]
    
    D --> E[Anomaly Detection]
    D --> F[Failure Risk Prediction]
    D --> G[RUL Prediction]
    
    E --> H[Machine Health]
    F --> H
    G --> H
    
    H --> I[Confidence/Uncertainty]
    H --> J[Explainability / XAI]
    
    I --> K[Maintenance Recommendation]
    J --> K
    
    K --> L[Engineer Decision]
    L --> M[Maintenance Action]
```

---

## 3. Data Flow Diagram

Illustrates the flow of telemetry data from simulated/real-world ingestion through to the final AI insights presented to the user.

```mermaid
sequenceDiagram
    participant E as Equipment (Simulated)
    participant F as Frontend Client
    participant A as FastAPI API
    participant ML as AI Inference Engine
    participant DB as SQLite DB

    E->>A: POST /api/v1/telemetry/simulate/{id} (Sensors)
    A->>DB: Save raw SensorData
    
    F->>A: POST /api/v1/telemetry/ai-health-check/{id}
    A->>DB: Query last 10 SensorData records
    DB-->>A: Return Time-Series Window
    
    A->>ML: predict_machine_state(window)
    ML-->>ML: Preprocess (Normalize)
    ML-->>ML: Autoencoder (Anomaly Score)
    ML-->>ML: Predictor (Failure Risk, RUL)
    ML-->>ML: Feature Attribution (Explainability)
    ML-->>A: AI Results Dictionary
    
    A->>DB: Save AIPrediction Record
    A->>DB: Save AIDataLineage Record (Non-blocking)
    A-->>F: Return AIPrediction JSON
    
    F->>F: Update Dashboard & Visualizations
```

---

## 4. UML Use Case Diagram

```mermaid
usecaseDiagram
    actor "Maintenance Engineer" as Eng
    
    usecase "View Factory Map" as UC1
    usecase "View Live Telemetry" as UC2
    usecase "Trigger AI Health Check" as UC3
    usecase "Run What-If Simulation" as UC4
    usecase "View AI Data Lineage" as UC5
    usecase "Interact with Maintenance Copilot" as UC6
    
    Eng --> UC1
    Eng --> UC2
    Eng --> UC3
    Eng --> UC4
    Eng --> UC5
    Eng --> UC6
```

---

## 5. UML Class Diagram

Shows the primary backend Object-Relational Mapping (ORM) models representing the business logic.

```mermaid
classDiagram
    class User {
        +Integer id
        +String email
        +String hashed_password
        +String role
        +Boolean is_active
    }
    
    class Machine {
        +Integer id
        +String name
        +String type
        +String status
        +Float health_score
        +DateTime last_maintenance
        +DateTime installation_date
    }
    
    class SensorData {
        +Integer id
        +Integer machine_id
        +DateTime timestamp
        +Float temperature
        +Float vibration
        +Float pressure
        +Float rpm
        +Float current
        +Float voltage
        +Boolean is_anomaly
    }
    
    class AIPrediction {
        +Integer id
        +Integer machine_id
        +DateTime timestamp
        +Float failure_risk
        +Float rul_days
        +Float confidence
        +Float health_score
        +String explanation_json
    }
    
    class AIDataLineage {
        +Integer id
        +String lineage_id
        +String result_type
        +String result_id
        +String machine_id
        +String model_name
        +String model_version
        +String model_run_id
        +JSON output_summary
    }

    Machine "1" -- "*" SensorData : has
    Machine "1" -- "*" AIPrediction : receives
```

---

## 6. Database / Entity-Relationship (ER) Documentation

The current physical schema maps directly to the SQLAlchemy ORM models on an asynchronous SQLite database.

```mermaid
erDiagram
    users {
        int id PK
        string email
        string hashed_password
        string role
        boolean is_active
    }
    
    machines {
        int id PK
        string name
        string type
        string status
        float health_score
        datetime last_maintenance
        datetime installation_date
    }
    
    sensor_data {
        int id PK
        int machine_id FK
        datetime timestamp
        float temperature
        float vibration
        float pressure
        float rpm
        float current
        float voltage
        boolean is_anomaly
    }
    
    ai_predictions {
        int id PK
        int machine_id FK
        datetime timestamp
        float failure_risk
        float rul_days
        float confidence
        float health_score
        string explanation_json
    }
    
    ai_data_lineage {
        int id PK
        string lineage_id
        string result_type
        string result_id
        string machine_id
        string model_name
        string model_version
        string model_run_id
        datetime created_at
        json output_summary
    }

    machines ||--o{ sensor_data : generates
    machines ||--o{ ai_predictions : has_predictions
```

---

## 7. AI Model Architecture Documentation

The system has transitioned from legacy algorithms to a **Dual-Objective Time-Series Transformer**.

1.  **Input Representation:** Multivariate time-series data with a window size of 10. `[seq_len=10, features=6]` (Temperature, Vibration, Pressure, RPM, Current, Voltage).
2.  **Transformer Autoencoder:** Learns standard representations of healthy machine states. When live data is reconstructed with a high Mean Squared Error (MSE), it flags a real-time `anomaly`.
3.  **Transformer Predictor:** A supervised forecasting head attached to the transformer blocks. It directly predicts continuous outputs for `failure_risk` (probability mapping) and `rul_days` (Remaining Useful Life regression).
4.  **Explainability (XAI):** Feature attribution is currently extracted by analyzing input deviations against normalized baselines, mapping attribution back to specific features to explain *why* the model predicted a failure (e.g., "Vibration: 55% attribution").

---

## 8. Maintenance Workflow Documentation

The UI and API orchestrate a closed-loop workflow:

1.  **Monitor:** User visually tracks machine arrays in `FactoryMap` or `Dashboard`.
2.  **Investigate:** User navigates to `MachineDetails` upon noticing a drop in `health_score`.
3.  **Predict:** User runs "AI Health Check" fetching a live PyTorch inference on the most recent 10 ticks of data.
4.  **Simulate:** If risk is elevated, user runs "What-If Simulation" (e.g., testing if lowering machine load by 20% extends the RUL).
5.  **Audit:** User clicks "View Data Lineage" to verify which model version generated the prediction and what inputs were used.
6.  **Act:** Armed with explainable AI outputs, the engineer safely initiates maintenance protocols.
