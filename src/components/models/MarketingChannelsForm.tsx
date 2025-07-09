import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MarketingSetup, MarketingChannelItem, ModelAssumptions, ModelMetadata } from '@/types/models';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trash2, PlusCircle, Edit2 } from 'lucide-react';
import { formatCurrency } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface MarketingChannelsFormProps {
  marketingSetup: MarketingSetup;
  updateAssumptions: (updatedFields: Partial<ModelAssumptions>) => void;
  modelTimeUnit: 'Week' | 'Month';
  metadata?: ModelMetadata;
}

const defaultChannelTypes = [
  "Social Media Ads",
  "Search Engine Ads (SEM)",
  "Content Marketing",
  "Email Marketing",
  "Affiliate Marketing",
  "Influencer Marketing",
  "Print Media",
  "Events/Trade Shows",
  "Referral Program",
  "Public Relations (PR)",
  "Custom",
];

export const MarketingChannelsForm: React.FC<MarketingChannelsFormProps> = ({
  marketingSetup,
  updateAssumptions,
  modelTimeUnit,
  metadata
}) => {
  const [allocationMode, setAllocationMode] = useState<'channels' | 'highLevel'>(
      marketingSetup.allocationMode || 'channels'
  );
  const [channels, setChannels] = useState<MarketingChannelItem[]>(
      marketingSetup.channels || []
  );
  const [totalBudget, setTotalBudget] = useState<number>(
      marketingSetup.totalBudget || 0
  );
  const [budgetApplication, setBudgetApplication] = useState<'upfront' | 'spreadEvenly' | 'spreadCustom'>(
      marketingSetup.budgetApplication || 'spreadEvenly'
  );
  const [spreadDuration, setSpreadDuration] = useState<number>(
      marketingSetup.spreadDuration || 12
  );

  const [editingChannel, setEditingChannel] = useState<MarketingChannelItem | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setChannels(marketingSetup.channels || []);
    setIsDirty(false); 
  }, [marketingSetup]);

  useEffect(() => {
    const propsChannelsString = JSON.stringify(marketingSetup.channels || []);
    const internalChannelsString = JSON.stringify(channels);
    setIsDirty(internalChannelsString !== propsChannelsString);
  }, [channels, marketingSetup]);

  useEffect(() => {
    const currentInternalSetup: MarketingSetup = {
      allocationMode,
      channels: allocationMode === 'channels' ? channels : [], 
      totalBudget: allocationMode === 'highLevel' ? totalBudget : undefined,
      budgetApplication: allocationMode === 'highLevel' ? budgetApplication : undefined,
      spreadDuration: allocationMode === 'highLevel' && budgetApplication === 'spreadCustom' ? spreadDuration : undefined,
    };
    const propsSetupString = JSON.stringify(marketingSetup || { allocationMode: 'channels', channels: [] });
    const internalSetupString = JSON.stringify(currentInternalSetup);
    setIsDirty(internalSetupString !== propsSetupString);
  }, [allocationMode, channels, totalBudget, budgetApplication, spreadDuration, marketingSetup]);

  const handleAddChannel = () => {
    setEditingChannel({
      id: uuidv4(),
      channelType: defaultChannelTypes[0],
      name: '',
      weeklyBudget: 0,
      targetAudience: '',
      description: '',
    });
    setIsAdding(true);
  };

  const handleEditChannel = (channel: MarketingChannelItem) => {
    setEditingChannel({ ...channel });
    setIsAdding(false);
  };

  const handleSaveChannel = () => {
    if (!editingChannel) return;
    let updatedChannels;
    if (isAdding) {
      updatedChannels = [...channels, editingChannel];
    } else {
      updatedChannels = channels.map(ch => ch.id === editingChannel.id ? editingChannel : ch);
    }
    setChannels(updatedChannels);
    setEditingChannel(null);
    setIsAdding(false);
  };

  const handleDeleteChannel = (id: string) => {
    const updatedChannels = channels.filter(ch => ch.id !== id);
    setChannels(updatedChannels);
  };

  const handleCancelEdit = () => {
    setEditingChannel(null);
    setIsAdding(false);
  };

  const handleInputChange = (field: keyof MarketingChannelItem, value: string | number) => {
    if (!editingChannel) return;
    setEditingChannel({ ...editingChannel, [field]: value });
  };
  
  const handleSelectChange = (value: string) => {
     if (!editingChannel) return;
     setEditingChannel({ ...editingChannel, channelType: value });
  };

  const handleSaveChanges = () => {
     const currentInternalSetup: MarketingSetup = {
      allocationMode,
      channels: allocationMode === 'channels' ? channels : [], 
      totalBudget: allocationMode === 'highLevel' ? totalBudget : undefined,
      budgetApplication: allocationMode === 'highLevel' ? budgetApplication : undefined,
      spreadDuration: allocationMode === 'highLevel' && budgetApplication === 'spreadCustom' ? spreadDuration : undefined,
    };
    updateAssumptions({ marketing: currentInternalSetup });
  };

  const totalWeeklyChannelBudget = channels.reduce((sum, ch) => sum + (ch.weeklyBudget || 0), 0);

  const getModelDuration = () => {
    if (metadata) {
      if (modelTimeUnit === 'Week') {
        return metadata.weeks ?? 12;
      }
      if (metadata.months !== undefined) {
        return metadata.months;
      }
    }
    if (marketingSetup.budgetApplication === 'spreadCustom' && marketingSetup.spreadDuration) {
      return marketingSetup.spreadDuration;
    }
    return 12;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing Budget & Allocation</CardTitle>
        <CardDescription>Configure marketing spend either by detailed channels or a high-level budget.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
           <Label className="mb-2 block">Allocation Mode</Label>
            <RadioGroup 
              value={allocationMode}
              onValueChange={(value: 'channels' | 'highLevel') => setAllocationMode(value)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="channels" id="channels" />
                <Label htmlFor="channels">Detailed Channels</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="highLevel" id="highLevel" />
                <Label htmlFor="highLevel">High-Level Budget</Label>
              </div>
            </RadioGroup>
         </div>
        
        {allocationMode === 'channels' && (
          <div className="space-y-4 pt-4 border-t">
             <div className="flex justify-between items-center mb-4"> 
                <h3 className="text-lg font-semibold">Channel Breakdown</h3>
                <Button size="sm" onClick={handleAddChannel} disabled={!!editingChannel}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Channel
                </Button>
             </div>
             
             {editingChannel && (
               <div className="border p-4 rounded-md mb-6 bg-muted/40 space-y-4">
                 <h3 className="text-lg font-semibold mb-2">{isAdding ? 'Add New Channel' : 'Edit Channel'}</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <Label htmlFor="channelType">Channel Type</Label>
                     <Select value={editingChannel.channelType} onValueChange={handleSelectChange}>
                       <SelectTrigger id="channelType"><SelectValue placeholder="Select type..." /></SelectTrigger>
                       <SelectContent>{defaultChannelTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                     </Select>
                   </div>
                   <div>
                     <Label htmlFor="channelName">Channel Name</Label>
                     <Input id="channelName" value={editingChannel.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder="e.g., Facebook Q1 Campaign"/>
                   </div>
                 </div>
                 <div>
                   <Label htmlFor="weeklyBudget">Weekly Budget <span className="text-red-500">*</span></Label>
                   <Input 
                     id="weeklyBudget" 
                     type="number" 
                     value={editingChannel.weeklyBudget} 
                     onChange={(e) => handleInputChange('weeklyBudget', parseFloat(e.target.value) || 0)} 
                     placeholder="Enter weekly budget amount (required for actuals tracking)"
                     className={editingChannel.weeklyBudget <= 0 ? "border-red-300 focus:border-red-500" : ""}
                   />
                   {editingChannel.weeklyBudget <= 0 && (
                     <p className="text-xs text-red-600 mt-1">Budget amount required to enable marketing actuals tracking</p>
                   )}
                 </div>
                 <div>
                   <Label htmlFor="targetAudience">Target Audience</Label>
                   <Input id="targetAudience" value={editingChannel.targetAudience} onChange={(e) => handleInputChange('targetAudience', e.target.value)} placeholder="e.g., Young Professionals, Age 25-35"/>
                 </div>
                 <div>
                   <Label htmlFor="description">Description / Strategy Notes</Label>
                   <Textarea id="description" value={editingChannel.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="Optional: Specific goals, tactics, KPIs..."/>
                 </div>
                 <div className="flex justify-end space-x-2 pt-4">
                   <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                   <Button onClick={handleSaveChannel}>Save Channel Changes</Button> 
                 </div>
               </div>
             )}

             <div className="space-y-4">
               {channels.length === 0 && !editingChannel && (
                 <p className="text-muted-foreground text-center py-4">No marketing channels configured yet. Click 'Add Channel' to start.</p>
               )}
               {channels.map(channel => (
                 <div key={channel.id} className="border p-3 rounded-md flex justify-between items-start hover:bg-muted/20">
                   <div>
                     <p className="font-semibold">{channel.name} <span className="text-sm font-normal text-muted-foreground">({channel.channelType})</span></p>
                     <p className="text-sm text-muted-foreground">Budget: {formatCurrency(channel.weeklyBudget)} / week</p>
                     {channel.targetAudience && <p className="text-xs mt-1">Target: {channel.targetAudience}</p>}
                     {channel.description && <p className="text-xs mt-1 text-gray-600">Notes: {channel.description}</p>}
                   </div>
                   <div className="flex space-x-2 flex-shrink-0 ml-4">
                     <Button variant="ghost" size="icon" onClick={() => handleEditChannel(channel)} disabled={!!editingChannel}><Edit2 className="h-4 w-4" /></Button>
                     <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteChannel(channel.id)} disabled={!!editingChannel}><Trash2 className="h-4 w-4" /></Button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {allocationMode === 'highLevel' && (
           <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold">High-Level Budget Setup</h3>
               <div>
                  <Label htmlFor="totalBudget">Total Marketing Budget</Label>
                  <Input 
                    id="totalBudget"
                    type="number" 
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 50000"
                  />
               </div>
               
               <div>
                 <Label htmlFor="budgetApplication">Budget Application</Label>
                  <Select 
                    value={budgetApplication}
                    onValueChange={(value: 'upfront' | 'spreadEvenly' | 'spreadCustom') => setBudgetApplication(value)}
                  >
                    <SelectTrigger id="budgetApplication">
                      <SelectValue placeholder="Select application method..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upfront">Apply Upfront (Period 1)</SelectItem>
                      <SelectItem value="spreadEvenly">Spread Evenly (Across Full Duration)</SelectItem>
                      <SelectItem value="spreadCustom">Spread Over Specific Duration</SelectItem>
                    </SelectContent>
                  </Select>
               </div>

               {budgetApplication === 'spreadCustom' && (
                  <div>
                    <Label htmlFor="spreadDuration">Spread Duration ({modelTimeUnit}s)</Label>
                    <Input 
                      id="spreadDuration"
                      type="number"
                      value={spreadDuration}
                      onChange={(e) => setSpreadDuration(parseInt(e.target.value) || 1)}
                      min="1"
                      placeholder={`Number of ${modelTimeUnit}s`} 
                    />
                    <p className="text-xs text-muted-foreground mt-1">Budget will be applied evenly over the first {spreadDuration} {modelTimeUnit}(s).</p>
                  </div>
               )}
               
               <div className="mt-4 pt-4 border-t">
                   <p className="text-sm text-muted-foreground">
                       {budgetApplication === 'upfront' && `Effective Cost: ${formatCurrency(totalBudget)} in Period 1 only.`}
                       {budgetApplication === 'spreadEvenly' && `Effective Cost: Approximately ${formatCurrency(totalBudget / getModelDuration())} per ${modelTimeUnit}.`}
                       {budgetApplication === 'spreadCustom' && spreadDuration > 0 && `Effective Cost: ${formatCurrency(totalBudget / spreadDuration)} per ${modelTimeUnit} for the first ${spreadDuration} ${modelTimeUnit}s.`}
                   </p>
               </div>
           </div>
        )}

        <div className="mt-6 pt-6 border-t space-y-3">
          <div className="flex justify-between items-center">
            <div>
              {allocationMode === 'channels' && channels.length > 0 && (
                <div>
                  <p className="text-lg font-semibold">
                    Total Weekly Budget: {formatCurrency(totalWeeklyChannelBudget)}
                  </p>
                  {totalWeeklyChannelBudget <= 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ Set budget amounts to enable marketing actuals tracking
                    </p>
                  )}
                </div>
              )}
              {allocationMode === 'highLevel' && (
                <div>
                  <p className="text-lg font-semibold">
                    Total Budget: {formatCurrency(totalBudget)}
                  </p>
                  {totalBudget <= 0 && (
                    <p className="text-sm text-amber-600 mt-1">
                      ⚠️ Set budget amount to enable marketing actuals tracking
                    </p>
                  )}
                </div>
              )}
            </div>
            <Button onClick={handleSaveChanges} disabled={!isDirty}>
                Save Marketing Setup
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 