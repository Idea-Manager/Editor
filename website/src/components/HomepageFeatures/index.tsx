import type {ReactNode, SVGProps} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Icon: (props: SVGProps<SVGSVGElement>) => ReactNode;
  description: ReactNode;
};

function IconText(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
      {...props}>
      <path d="M4 5.5h16M4 9.5h12M4 13.5h16M4 17.5h9" />
    </svg>
  );
}

function IconFrame(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      aria-hidden
      {...props}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="2" />
      <rect x="6" y="6" width="12" height="10" rx="1" />
    </svg>
  );
}

function IconOpenSource(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.35-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85.004 1.705.09 2.54.27 1.9-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.31.68.92.68 1.85 0 1.34-.01 2.42-.01 2.75 0 .27.18.59.69.48A10.01 10.01 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

const FeatureList: FeatureItem[] = [
  {
    title: 'Block text editing',
    Icon: IconText,
    description: (
      <>
        <p>
          Structured blocks, clear split between core logic and UI. Text mode is
          where you write; graphics can appear in the flow as frames.
        </p>
      </>
    ),
  },
  {
    title: 'Graphic editor',
    Icon: IconFrame,
    description: (
      <>
        <p>
          A dedicated graphic mode for layouts (roadmap). Import or embed those
          pieces into text docs as frames so editing stays one workflow.
        </p>
      </>
    ),
  },
  {
    title: 'Open source',
    Icon: IconOpenSource,
    description: (
      <>
        <p>
          MIT License. Contributions welcome — see{' '}
          <Link to="/docs/contributing">contributing</Link>.
        </p>
      </>
    ),
  },
];

function Feature({title, Icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureIconWrap}>
        <Icon className={styles.featureIcon} />
      </div>
      <div className={clsx('text--center padding-horiz--md', styles.featureCopy)}>
        <Heading as="h3" className={styles.featureHeading}>
          {title}
        </Heading>
        <div className={styles.featureDescription}>{description}</div>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
