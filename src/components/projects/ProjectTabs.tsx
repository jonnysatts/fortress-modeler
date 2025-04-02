import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ProjectTabsProps {
  activeTab: string;
  onChange: (value: string) => void;
  className?: string;
}

const ProjectTabs: React.FC<ProjectTabsProps> = ({ 
  activeTab, 
  onChange,
  className 
}) => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  
  return (
    <Tabs 
      value={activeTab} 
      onValueChange={onChange}
      className={cn("w-full", className)}
    >
      <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
        <TabsTrigger 
          value="overview" 
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-fortress-blue px-4 py-3"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger 
          value="models" 
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-fortress-blue px-4 py-3"
        >
          Financial Models
        </TabsTrigger>
        <TabsTrigger 
          value="performance" 
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-fortress-blue px-4 py-3"
        >
          Performance
        </TabsTrigger>
        <TabsTrigger 
          value="risks" 
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-fortress-blue px-4 py-3"
        >
          Risks
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default ProjectTabs;
