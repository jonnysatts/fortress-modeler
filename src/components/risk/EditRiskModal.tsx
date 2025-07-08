/**
 * Edit Risk Modal - User-friendly risk editing for product managers
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  SimpleRisk, 
  SimpleRiskCategory, 
  SimpleRiskPriority, 
  SimpleRiskStatus,
  SIMPLE_RISK_CATEGORIES, 
  RISK_PRIORITY_CONFIG,
  RISK_STATUS_CONFIG 
} from '@/types/simpleRisk';
import { toast } from "sonner";

interface EditRiskModalProps {
  isOpen: boolean;
  onClose: () => void;
  risk: SimpleRisk;
  onRiskUpdated: (updatedRisk: SimpleRisk) => void;
}

export const EditRiskModal: React.FC<EditRiskModalProps> = ({
  isOpen,
  onClose,
  risk,
  onRiskUpdated
}) => {
  const [formData, setFormData] = useState({
    title: risk.title,
    description: risk.description,
    category: risk.category,
    priority: risk.priority,
    status: risk.status,
    potentialImpact: risk.potentialImpact,
    mitigationPlan: risk.mitigationPlan,
    owner: risk.owner,
    targetDate: risk.targetDate || ''
  });

  // Reset form when risk changes
  useEffect(() => {
    setFormData({
      title: risk.title,
      description: risk.description,
      category: risk.category,
      priority: risk.priority,
      status: risk.status,
      potentialImpact: risk.potentialImpact,
      mitigationPlan: risk.mitigationPlan,
      owner: risk.owner,
      targetDate: risk.targetDate || ''
    });
  }, [risk]);

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updatedRisk: SimpleRisk = {
      ...risk,
      ...formData,
      updatedAt: new Date().toISOString()
    };

    try {
      onRiskUpdated(updatedRisk);
      toast.success('Risk updated successfully!');
      onClose();
    } catch (error) {
      console.error('Failed to update risk:', error);
      toast.error('Failed to update risk. Please try again.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Risk</DialogTitle>
          <DialogDescription>
            Update the details and mitigation plan for this risk.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Risk Information</h3>
            
            <div>
              <Label htmlFor="title" className="text-sm font-medium">
                Risk Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as SimpleRiskCategory }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SIMPLE_RISK_CATEGORIES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center space-x-2">
                        <span>{config.icon}</span>
                        <span>{config.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="impact" className="text-sm font-medium">
                Potential Impact
              </Label>
              <Textarea
                id="impact"
                value={formData.potentialImpact}
                onChange={(e) => setFormData(prev => ({ ...prev, potentialImpact: e.target.value }))}
                className="mt-1"
                rows={2}
                placeholder="What could happen if this risk occurs?"
              />
            </div>
          </div>

          {/* Priority and Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Priority & Status</h3>
            
            <div>
              <Label className="text-sm font-medium">Priority Level</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.entries(RISK_PRIORITY_CONFIG).map(([key, config]) => (
                  <Card
                    key={key}
                    className={cn(
                      "p-3 cursor-pointer border-2 transition-all text-center",
                      formData.priority === key ? `${config.bgColor} ${config.borderColor}` : "border-border hover:border-gray-300"
                    )}
                    onClick={() => setFormData(prev => ({ ...prev, priority: key as SimpleRiskPriority }))}
                  >
                    <div className={cn("font-medium text-sm", formData.priority === key ? config.textColor : "")}>
                      {config.label}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Current Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as SimpleRiskStatus }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RISK_STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{config.label}</span>
                        <span className="text-xs text-muted-foreground">{config.action}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mitigation Plan */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Mitigation Plan</h3>
            
            <div>
              <Label htmlFor="mitigation" className="text-sm font-medium">
                Mitigation Strategy
              </Label>
              <Textarea
                id="mitigation"
                value={formData.mitigationPlan}
                onChange={(e) => setFormData(prev => ({ ...prev, mitigationPlan: e.target.value }))}
                className="mt-1"
                rows={3}
                placeholder="What are you doing to address this risk?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="owner" className="text-sm font-medium">
                  Owner
                </Label>
                <Input
                  id="owner"
                  value={formData.owner}
                  onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                  className="mt-1"
                  placeholder="Who's responsible?"
                />
              </div>

              <div>
                <Label htmlFor="targetDate" className="text-sm font-medium">
                  Target Date
                </Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-fortress-emerald hover:bg-fortress-emerald/90"
          >
            Update Risk
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};