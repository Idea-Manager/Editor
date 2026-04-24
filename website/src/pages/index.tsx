import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className={clsx('hero__title', styles.heroTitle)}>
          {siteConfig.title}
        </Heading>
        <div className={styles.heroIntro}>
          <p className={styles.heroLead}>
            Block-based writing and graphic editing in{' '}
            <span className={styles.heroLeadEm}>one workspace</span>—structured
            prose and visuals that stay connected.
          </p>
          <ul className={styles.heroPoints}>
            <li>
              <strong>Text mode</strong> — author and arrange content as blocks.
            </li>
            <li>
              <strong>Graphic mode</strong> — lay out visuals in a dedicated
              editing surface (on the roadmap).
            </li>
            <li>
              <strong>Frames</strong> — embed graphic compositions inside text
              documents so layouts live in the same document, not only as flat
              exports.
            </li>
          </ul>
        </div>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Read the docs
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description={siteConfig.tagline}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
