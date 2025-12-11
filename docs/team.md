---
sidebar_position: 10
---

# Team

Caramanta is the result of a collaborative capstone project by four UC Berkeley Master of Information and Data Science (MIDS) students.

## Team Members

### Connor Watson
**Forecast Agent Lead**

Connor led the development of the Forecast Agent, implementing the ML model suite and Spark parallelization architecture. His work on the "Train-Once Pattern" and forecast manifest tracking enabled the 180x speedup achievement.

**Key Contributions**:
- 15+ ML model implementations (ARIMA, Prophet, XGBoost, LSTM, TFT)
- Spark parallel backfill architecture
- Forecast manifest tracking system
- Model persistence and caching strategy

**Background**: Software engineering with focus on distributed systems and ML infrastructure.

---

### Stuart Holland
**Research Agent Lead**

Stuart architected the unified data platform that serves as the foundation for all forecasting and trading operations. His innovative forward-fill interpolation strategy achieved the 90% data reduction while maintaining complete market coverage.

**Key Contributions**:
- Unified data architecture design
- Bronze/Silver/Gold medallion implementation
- 6 AWS Lambda data collection functions
- 90% data reduction achievement

**Background**: Data engineering expertise with experience in cloud infrastructure and ETL pipelines.

---

### Francisco Munoz
**Trading Agent Specialist**

Francisco developed the trading strategy optimization framework and implemented the rigorous statistical validation process that ensures only high-performing models make it to production.

**Key Contributions**:
- 9 trading strategy implementations
- Statistical validation framework (Diebold-Mariano testing)
- 70%+ accuracy threshold discovery
- Backtesting and performance metrics

**Background**: Quantitative finance with expertise in algorithmic trading and risk management.

---

### Tony Gibbons
**Trading Agent Lead & Integration**

Tony led the Trading Agent development and orchestrated the integration of all three agents into a cohesive end-to-end system. His work on the Rolling Horizon MPC controller enables dynamic decision-making in production.

**Key Contributions**:
- Rolling Horizon MPC controller
- End-to-end system integration
- Production deployment architecture
- Parameter optimization framework

**Background**: Software engineering and quantitative methods with focus on optimization and control systems.

---

## Project Timeline

| Phase | Duration | Lead | Deliverables |
|:------|:---------|:-----|:-------------|
| **Research & Planning** | Weeks 1-2 | All | Project scope, data sources, architecture design |
| **Data Infrastructure** | Weeks 3-6 | Stuart | Bronze→Silver→Gold pipeline, unified data |
| **ML Model Development** | Weeks 7-11 | Connor | 15+ models, Spark parallelization |
| **Trading Strategies** | Weeks 9-13 | Francisco, Tony | 9 strategies, statistical validation |
| **Integration & Testing** | Weeks 12-14 | All | End-to-end system, performance tuning |
| **Production Deployment** | Week 15 | Tony | Live system, monitoring, documentation |

## Technology Stack

| Layer | Technologies | Primary Owner |
|:------|:------------|:--------------|
| **Data Collection** | AWS Lambda, S3, EventBridge | Stuart |
| **Data Platform** | Databricks, Delta Lake, PySpark | Stuart |
| **ML Framework** | scikit-learn, Prophet, XGBoost, PyTorch | Connor |
| **Optimization** | SciPy, NumPy, MPC | Tony |
| **Trading Logic** | Python, Pandas, Statistical Testing | Francisco |
| **Deployment** | Databricks Workflows, Git | Tony |

## Key Achievements by Agent

### Research Agent (Stuart)

**Data Architecture Innovation**:
- Designed unified data table with continuous daily coverage
- Implemented forward-fill interpolation for gap handling
- Achieved 90% data reduction (75k → 7.6k rows)
- Zero null values through intelligent data engineering

**Infrastructure Excellence**:
- 6 AWS Lambda functions for automated data collection
- Bronze/Silver/Gold medallion architecture
- Delta Lake for ACID transactions and time-travel
- Cost-efficient serverless infrastructure ($0.20/day)

### Forecast Agent (Connor)

**ML Performance Breakthrough**:
- 180x speedup evolution (V1 → V2 → V3)
- Train-Once Pattern with persistent model storage
- Parallel Spark backfills for efficient training
- Forecast manifest for metadata tracking

**Model Diversity**:
- 15+ models spanning statistical, tree-based, and deep learning
- "Fit many, publish few" strategy (93% compute savings)
- Comprehensive hyperparameter optimization
- Cross-validation across multiple time windows

### Trading Agent (Francisco & Tony)

**Strategy Development**:
- 9 distinct trading strategies for different market conditions
- Statistical validation framework (Diebold-Mariano)
- 70%+ accuracy threshold discovery
- Rolling Horizon MPC for dynamic optimization

**System Integration**:
- End-to-end pipeline from data collection to trading signals
- Automated backfilling and performance monitoring
- Production-grade error handling and logging
- Real-time decision-making capability (less than 5 min latency)

## Academic Supervision

**Program**: Master of Information and Data Science (MIDS)

**Institution**: UC Berkeley School of Information

**Capstone Year**: 2024

## Acknowledgments

We would like to thank:

- **UC Berkeley MIDS Faculty** for guidance and mentorship throughout the capstone project
- **Industry Mentors** who provided domain expertise in commodity trading and quantitative finance
- **Databricks** for providing the cloud platform that enabled our scalable ML infrastructure
- **Open Source Community** for the excellent libraries (Prophet, XGBoost, PyTorch) that powered our models

## Contact & Links

### Project Resources

- **GitHub Repository**: [github.com/gibbonstony/ucberkeley-capstone](https://github.com/gibbonstony/ucberkeley-capstone)
- **Live System**: [studiomios.wixstudio.com/caramanta](https://studiomios.wixstudio.com/caramanta)
- **Technical Documentation**: This site

### UC Berkeley MIDS

- **School of Information**: [ischool.berkeley.edu](https://www.ischool.berkeley.edu/)
- **MIDS Program**: [ischool.berkeley.edu/programs/mids](https://www.ischool.berkeley.edu/programs/mids)

---

**Project Status**: Complete ✅

**Completion Date**: December 2024

Built with ❤️ by Connor Watson, Stuart Holland, Francisco Munoz, and Tony Gibbons
