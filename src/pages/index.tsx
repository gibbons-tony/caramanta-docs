import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p style={{fontSize: '1.1rem', marginTop: '1rem', opacity: 0.9}}>
          UC Berkeley MIDS Capstone Project 2024
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/overview"
            style={{marginRight: '1rem'}}>
            📚 Read the Docs
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            href="https://github.com/gibbonstony/ucberkeley-capstone">
            💻 View on GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="col col--3">
            <div className="text--center padding-horiz--md">
              <h2>90%</h2>
              <h3>Data Reduction</h3>
              <p>
                From 75,000 raw data points to 7,600 unified daily records
              </p>
            </div>
          </div>
          <div className="col col--3">
            <div className="text--center padding-horiz--md">
              <h2>180x</h2>
              <h3>Speedup</h3>
              <p>
                Evolution from V1 → V2 → V3 architecture
              </p>
            </div>
          </div>
          <div className="col col--3">
            <div className="text--center padding-horiz--md">
              <h2>70%+</h2>
              <h3>Accuracy</h3>
              <p>
                Rigorous statistical testing for model validation
              </p>
            </div>
          </div>
          <div className="col col--3">
            <div className="text--center padding-horiz--md">
              <h2>93%</h2>
              <h3>Compute Savings</h3>
              <p>
                "Fit many, publish few" deployment strategy
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentCards() {
  return (
    <section className={styles.agents}>
      <div className="container">
        <div className="row">
          <div className="col col--4">
            <div className="card" style={{height: '100%'}}>
              <div className="card__header">
                <h3>🔬 Research Agent</h3>
              </div>
              <div className="card__body">
                <p>
                  Data collection and ETL pipeline with 6 AWS Lambda functions.
                  Bronze → Silver → Gold medallion architecture on Databricks.
                </p>
                <ul>
                  <li>90% data reduction achievement</li>
                  <li>Continuous daily coverage</li>
                  <li>Zero null values</li>
                </ul>
              </div>
              <div className="card__footer">
                <Link
                  className="button button--primary button--block"
                  to="/docs/research-agent/introduction">
                  Learn More →
                </Link>
              </div>
            </div>
          </div>
          <div className="col col--4">
            <div className="card" style={{height: '100%'}}>
              <div className="card__header">
                <h3>📈 Forecast Agent</h3>
              </div>
              <div className="card__body">
                <p>
                  Machine learning forecasting engine with 15+ models.
                  Parallel Spark backfills and train-once architecture.
                </p>
                <ul>
                  <li>180x speedup evolution</li>
                  <li>Probabilistic predictions</li>
                  <li>Statistical validation</li>
                </ul>
              </div>
              <div className="card__footer">
                <Link
                  className="button button--primary button--block"
                  to="/docs/forecast-agent/introduction">
                  Learn More →
                </Link>
              </div>
            </div>
          </div>
          <div className="col col--4">
            <div className="card" style={{height: '100%'}}>
              <div className="card__header">
                <h3>💰 Trading Agent</h3>
              </div>
              <div className="card__body">
                <p>
                  Strategy optimization and execution with 9 trading strategies.
                  Rolling Horizon MPC for dynamic decision-making.
                </p>
                <ul>
                  <li>70%+ accuracy threshold</li>
                  <li>Statistical validation</li>
                  <li>Risk-adjusted returns</li>
                </ul>
              </div>
              <div className="card__footer">
                <Link
                  className="button button--primary button--block"
                  to="/docs/trading-agent/introduction">
                  Learn More →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description="AI-Powered Commodity Trading Agent with Advanced Forecasting">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <AgentCards />
      </main>
    </Layout>
  );
}
