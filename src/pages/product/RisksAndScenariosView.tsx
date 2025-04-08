import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TypographyH4, TypographyMuted } from '@/components/ui/typography';
import ScenariosView from './ScenariosView';

/**
 * RisksAndScenariosView Component
 * Container component for the Risks & Scenarios tab
 * Handles switching between Risks and Scenarios
 */
const RisksAndScenariosView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('scenarios');
  
  return (
    <div className="space-y-6">
      <div>
        <TypographyH4>Risks & Scenarios</TypographyH4>
        <TypographyMuted>
          Analyze potential risks and model different business scenarios
        </TypographyMuted>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scenarios" className="space-y-6">
          <ScenariosView />
        </TabsContent>
        
        <TabsContent value="risks" className="space-y-6">
          <div className="py-8 text-center">
            <TypographyH4>Risks Analysis</TypographyH4>
            <TypographyMuted className="mt-2">
              The Risks feature is coming soon. Please check back later.
            </TypographyMuted>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RisksAndScenariosView;
