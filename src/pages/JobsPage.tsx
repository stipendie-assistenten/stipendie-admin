import React from 'react';
import { SyncFoundationsCard } from '@/components/jobs/SyncFoundationsCard';
import { TranslationJobsCard } from '@/components/jobs/TranslationJobsCard';
import { EnrichmentJobsCard } from '@/components/jobs/EnrichmentJobsCard';
import { SystemActionsCard } from '@/components/jobs/SystemActionsCard';
import { useActiveJobs } from '@/hooks/useActiveJobs';

const JobsPage: React.FC = () => {
  const { activeJobs, refresh } = useActiveJobs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Backend Jobs</h1>
        <p className="text-muted-foreground">
          Hantera bakgrundsjobb, översättningar och berikning av stiftelsedata.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <SyncFoundationsCard 
            activeJobId={activeJobs.sync_foundations?.task_id} 
            onComplete={refresh} 
          />
          <EnrichmentJobsCard />
        </div>

        <div className="space-y-6">
          <TranslationJobsCard 
            activeTranslationJobId={activeJobs.bulk_translation?.task_id}
            activeEmbeddingJobId={activeJobs.bulk_embeddings?.task_id}
            onComplete={refresh}
          />
          <SystemActionsCard />
        </div>
      </div>
    </div>
  );
};

export default JobsPage;
