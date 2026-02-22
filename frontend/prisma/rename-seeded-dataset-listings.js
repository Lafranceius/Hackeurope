const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categoryConfigs = [
  {
    category: 'Finance',
    oldPrefix: 'Global Equity Signal Dataset',
    titleSeeds: [
      'Equity OHLCV Time Series',
      'FX Spot Rate Time Series',
      'Index Futures Order Book Snapshots',
      'Options Implied Volatility Surface',
      'Corporate Bond Spread Monitor'
    ],
    intervals: ['5m', '15m', '1h', '1d', '30s'],
    regionLabels: ['US Large Cap', 'Nordics', 'DACH', 'APAC Composite', 'UK Midcap'],
    descriptionNotes: [
      'normalized market timestamps and venue harmonization',
      'gap flags, split-adjustments, and holiday calendar alignment',
      'exchange session metadata and liquidity markers'
    ]
  },
  {
    category: 'Healthcare',
    oldPrefix: 'Clinical Outcomes Intelligence Dataset',
    titleSeeds: [
      'Hospital Bed Utilization Time Series',
      'Clinical Lab Turnaround Metrics',
      'ER Queue and Triage Throughput Feed',
      'Claims Adjudication Latency Panel',
      'Pharmacy Dispense Volume Index'
    ],
    intervals: ['1h', '6h', '1d', '12h', '30m'],
    regionLabels: ['US Northeast', 'US West', 'Benelux', 'Nordic Hospitals', 'UK NHS Trust Sample'],
    descriptionNotes: [
      'de-identified aggregates with compliance-safe segmentation',
      'facility-level trend normalization and anomaly flags',
      'weekly and seasonal adjustment fields for operational analytics'
    ]
  },
  {
    category: 'Retail',
    oldPrefix: 'Consumer Footfall and Spend Dataset',
    titleSeeds: [
      'Store Footfall Sensor Time Series',
      'Point-of-Sale Basket Velocity Feed',
      'Shopping Mall Dwell-Time Aggregates',
      'Regional Retail Inventory Pulse',
      'Promo Conversion and Coupon Redemption Stream'
    ],
    intervals: ['15m', '1h', '1d', '30m', '5m'],
    regionLabels: ['Nordic Urban Centers', 'US Suburban Malls', 'DACH Grocery Chain', 'UK High Street', 'Iberia Retail Parks'],
    descriptionNotes: [
      'store-level traffic and spend normalization with calendar tagging',
      'promotion windows, closure flags, and holiday uplift markers',
      'aggregated device-count and transaction proxies for demand modeling'
    ]
  },
  {
    category: 'Energy',
    oldPrefix: 'Grid Load and Generation Dataset',
    titleSeeds: [
      'Grid Load and Generation Time Series',
      'Solar Panel Output Telemetry',
      'Wind Turbine SCADA Performance Feed',
      'Substation Voltage and Frequency Monitor',
      'Offshore Maritime Sonar and Vessel Proximity Stream'
    ],
    intervals: ['5m', '1h', '10m', '30s', '10s'],
    regionLabels: ['Nordic Grid Zones', 'Southern Europe Solar Farms', 'North Sea Offshore Assets', 'US ISO Hubs', 'Baltic Marine Corridors'],
    descriptionNotes: [
      'plant and feeder telemetry with quality-controlled resampling',
      'weather-aligned generation metrics and outage annotations',
      'sensor drift checks, calibration markers, and downtime labels'
    ]
  }
];

async function main() {
  let totalUpdated = 0;

  for (let categoryIndex = 0; categoryIndex < categoryConfigs.length; categoryIndex += 1) {
    const config = categoryConfigs[categoryIndex];

    const datasets = await prisma.dataset.findMany({
      where: {
        categories: { has: config.category },
        title: { startsWith: config.oldPrefix }
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    });

    for (let index = 0; index < datasets.length; index += 1) {
      const item = index + 1;
      const seedTitle = config.titleSeeds[index % config.titleSeeds.length];
      const interval = config.intervals[index % config.intervals.length];
      const region = config.regionLabels[(index + categoryIndex) % config.regionLabels.length];
      const note = config.descriptionNotes[(index + categoryIndex) % config.descriptionNotes.length];
      const title = `${seedTitle} (${interval} interval) - ${region} ${String(item).padStart(2, '0')}`;
      const description = `${title} includes normalized records with ${note}. Delivery supports bulk export and API access with enterprise-grade QC automation.`;

      await prisma.dataset.update({
        where: { id: datasets[index].id },
        data: { title, description }
      });

      totalUpdated += 1;
    }

    console.log(`[rename-seeded-dataset-listings] ${config.category}: updated ${datasets.length}`);
  }

  console.log(`[rename-seeded-dataset-listings] total updated: ${totalUpdated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
