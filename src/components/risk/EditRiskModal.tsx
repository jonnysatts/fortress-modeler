/**
 * Edit Risk Modal - Full Supabase Integration
 * Allows product managers to modify existing risks
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertTriangle, 
  DollarSign, 
  Calendar, 
  User, 
  BarChart3,
  Target,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { useUpdateRisk } from '@/hooks/useRisks';
import { RiskCategory, RiskPriority, RiskStatus } from '@/services/RiskService';

interface User {
  id: string;
  email: string;
}

interface Risk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  priority: RiskPriority;
  status: RiskStatus;
  impact_description: string;
  likelihood: number;
  impact_score: number;
  risk_score: number;
  mitigation_plan?: string;
  target_date?: string;
  owner?: string;
  created_at: string;
  updated_at: string;
}

interface EditRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  risk: Risk;
  projectId: string;
  onRiskUpdated: () => void;
  user?: User | null;
}

// Risk categories with visual config
const RISK_CATEGORIES = {
  'customer': {
    name: 'Customer & Market',
    icon: <DollarSign className="h-4 w-4" />,
    color: 'blue'
  },
  'revenue': {
    name: 'Revenue & Financial', 
    icon: <DollarSign className="h-4 w-4" />,
    color: 'green'
  },
  'timeline': {
    name: 'Timeline & Delivery',
    icon: <Calendar className="h-4 w-4" />,
    color: 'purple'
  },
  'resources': {
    name: 'Resources & Team',
    icon: <User className="h-4 w-4" />,
    color: 'orange'
  },
  'market': {
    name: 'Market & External',
    icon: <BarChart3 className="h-4 w-4" />,
    color: 'indigo'
  }
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', multiplier: 1.0, color: 'green' },
  medium: { label: 'Medium', multiplier: 1.5, color: 'yellow' },
  high: { label: 'High', multiplier: 2.0, color: 'orange' },
  critical: { label: 'Critical', multiplier: 3.0, color: 'red' }
};

const STATUS_OPTIONS = [
  { value: 'identified', label: 'Identified', color: 'blue' },
  { value: 'monitoring', label: 'Monitoring', color: 'gray' },
  { value: 'mitigating', label: 'Mitigating', color: 'orange' },
  { value: 'resolved', label: 'Resolved', color: 'green' }
];

export const EditRiskModal: React.FC<EditRiskModalProps> = ({
  isOpen,
  onClose,
  risk,
  projectId,
  onRiskUpdated,
  user
}) => {
  const [formData, setFormData] = useState({
    title: risk.title,
    description: risk.description,
    category: risk.category,
    priority: risk.priority,
    status: risk.status,
    impact_description: risk.impact_description,
    likelihood: risk.likelihood,
    impact_score: risk.impact_score,
    mitigation_plan: risk.mitigation_plan || '',
    target_date: risk.target_date || '',
    owner: risk.owner || ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [enhancedScore, setEnhancedScore] = useState(risk.risk_score);

  const { mutate: updateRisk, isPending: isUpdating } = useUpdateRisk();

  // Reset form when risk changes
  useEffect(() => {
    setFormData({
      title: risk.title,
      description: risk.description,
      category: risk.category,
      priority: risk.priority,
      status: risk.status,
      impact_description: risk.impact_description,
      likelihood: risk.likelihood,
      impact_score: risk.impact_score,
      mitigation_plan: risk.mitigation_plan || '',
      target_date: risk.target_date || '',
      owner: risk.owner || ''
    });
    setEnhancedScore(risk.risk_score);
    setCurrentStep(1);
  }, [risk]);

  // Calculate enhanced risk score with priority multiplier
  const calculateEnhancedScore = useCallback(() => {
    const baseScore = (formData.likelihood * formData.impact_score) / 5;
    const priorityMultiplier = PRIORITY_CONFIG[formData.priority].multiplier;
    const enhanced = Math.round(baseScore * priorityMultiplier);
    setEnhancedScore(Math.min(100, enhanced));
  }, [formData.likelihood, formData.impact_score, formData.priority]);

  useEffect(() => {
    calculateEnhancedScore();
  }, [calculateEnhancedScore]);

  const handleSubmit = () => {
    // Validation
    if (!formData.title.trim()) {
      toast.error('Risk title is required');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Risk description is required');
      return;
    }

    const riskData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      priority: formData.priority,
      status: formData.status,
      impact_description: formData.impact_description.trim(),
      likelihood: formData.likelihood,
      impact_score: formData.impact_score,
      risk_score: enhancedScore,
      mitigation_plan: formData.mitigation_plan.trim() || undefined,
      target_resolution_date: formData.target_date || undefined,
      owner: formData.owner.trim() || undefined,
    };

    updateRisk(
      { riskId: risk.id, data: riskData },
      {
        onSuccess: () => {
          toast.success('Risk updated successfully');
          onRiskUpdated();
          onClose();
        },
        onError: (error) => {
          console.error('Error updating risk:', error);
          toast.error('Failed to update risk');
        }
      }
    );
  };

  const CategoryStep = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">Risk Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Brief, clear risk title"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="description">Risk Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Detailed description of the risk and its potential consequences"
          className="mt-1 min-h-[100px]"
        />
      </div>

      <div>
        <Label>Risk Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as RiskCategory }))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RISK_CATEGORIES).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  {config.icon}
                  {config.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const DetailsStep = () => (
    <div className="space-y-4">
      <div>
        <Label>Priority Level</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
            <Button
              key={key}
              type="button"
              variant={formData.priority === key ? "default" : "outline"}
              className={`justify-start ${formData.priority === key ? 'bg-fortress-emerald' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, priority: key as any }))}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-${config.color}-500`} />
                {config.label}
                <span className="text-xs opacity-70">({config.multiplier}x)</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-${option.color}-500`} />
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="impact_description">Impact Description</Label>
        <Textarea
          id="impact_description"
          value={formData.impact_description}
          onChange={(e) => setFormData(prev => ({ ...prev, impact_description: e.target.value }))}
          placeholder="What happens if this risk materializes?"
          className="mt-1"
        />
      </div>
    </div>
  );

  const AssessmentStep = () => (
    <div className="space-y-6">
      <div>
        <Label>Likelihood (1-5 scale)</Label>
        <div className="mt-2">
          <input
            type="range"
            min="1"
            max="5"
            value={formData.likelihood}
            onChange={(e) => setFormData(prev => ({ ...prev, likelihood: parseInt(e.target.value) }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Very Unlikely</span>
            <span>Likely</span>
            <span>Very Likely</span>
          </div>
          <div className="text-center mt-1">
            <Badge variant="outline">{formData.likelihood}/5</Badge>
          </div>
        </div>
      </div>

      <div>
        <Label>Impact Score (1-5 scale)</Label>
        <div className="mt-2">
          <input
            type="range"
            min="1"
            max="5"
            value={formData.impact_score}
            onChange={(e) => setFormData(prev => ({ ...prev, impact_score: parseInt(e.target.value) }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Minor Impact</span>
            <span>Moderate</span>
            <span>Severe Impact</span>
          </div>
          <div className="text-center mt-1">
            <Badge variant="outline">{formData.impact_score}/5</Badge>
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <Label className="text-sm font-medium">Enhanced Risk Score</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Base Score:</span>
            <span className="text-sm font-mono">
              {formData.likelihood} × {formData.impact_score} = {(formData.likelihood * formData.impact_score / 5).toFixed(1)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Priority Multiplier:</span>
            <span className="text-sm font-mono">
              {PRIORITY_CONFIG[formData.priority].multiplier}x ({PRIORITY_CONFIG[formData.priority].label})
            </span>
          </div>
          <div className="border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Enhanced Score:</span>
              <div className="flex items-center gap-2">
                <Progress value={enhancedScore} className="w-20 h-2" />
                <Badge className="bg-fortress-emerald text-white">
                  {enhancedScore}/100
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="mitigation_plan">Mitigation Plan (Optional)</Label>
        <Textarea
          id="mitigation_plan"
          value={formData.mitigation_plan}
          onChange={(e) => setFormData(prev => ({ ...prev, mitigation_plan: e.target.value }))}
          placeholder="Steps to prevent or minimize this risk"
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="target_date">Target Resolution Date</Label>
          <Input
            id="target_date"
            type="date"
            value={formData.target_date}
            onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="owner">Risk Owner</Label>
          <Input
            id="owner"
            value={formData.owner}
            onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
            placeholder="Who's responsible?"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return CategoryStep();
      case 2:
        return DetailsStep();
      case 3:
        return AssessmentStep();
      default:
        return CategoryStep();
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() && formData.description.trim() && formData.category;
      case 2:
        return formData.priority && formData.status && formData.impact_description.trim();
      case 3:
        return true; // Assessment step is always valid
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-fortress-emerald" />
            Edit Risk
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((step) => (
            <React.Fragment key={step}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-fortress-emerald text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`flex-1 h-1 rounded ${
                  step < currentStep ? 'bg-fortress-emerald' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="space-y-6">
          {renderStep()}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            {currentStep > 1 && (
              <Button 
                variant="outline"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={isUpdating}
              >
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep < 3 ? (
              <Button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed() || isUpdating}
                className="bg-fortress-emerald hover:bg-fortress-emerald/90"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit}
                disabled={!canProceed() || isUpdating}
                className="bg-fortress-emerald hover:bg-fortress-emerald/90"
              >
                {isUpdating ? 'Updating...' : 'Update Risk'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
