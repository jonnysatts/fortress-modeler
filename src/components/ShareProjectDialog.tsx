import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { apiService } from '@/lib/api';
import { toast } from 'sonner';

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onShareSuccess?: () => void;
}

interface ProjectShare {
  id?: string;
  email: string;
  permission: 'view' | 'edit';
}

export function ShareProjectDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  projectName, 
  onShareSuccess 
}: ShareProjectDialogProps) {
  const [shares, setShares] = useState<ProjectShare[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPermission, setNewPermission] = useState<'view' | 'edit'>('view');
  const [isLoading, setIsLoading] = useState(false);

  const addShare = () => {
    if (!newEmail.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (shares.some(share => share.email === newEmail)) {
      toast.error('This email is already in the share list');
      return;
    }

    setShares([...shares, { email: newEmail, permission: newPermission }]);
    setNewEmail('');
  };

  const removeShare = (index: number) => {
    setShares(shares.filter((_, i) => i !== index));
  };

  const updatePermission = (index: number, permission: 'view' | 'edit') => {
    const updatedShares = [...shares];
    updatedShares[index].permission = permission;
    setShares(updatedShares);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await apiService.shareProject(projectId, shares);
      toast.success('Project sharing updated successfully');
      onShareSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to share project:', error);
      toast.error('Failed to update project sharing');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
          <DialogDescription>
            Share "{projectName}" with others. They'll be able to view or edit based on the permissions you set.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add new share */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="flex space-x-2">
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addShare()}
              />
              <Select value={newPermission} onValueChange={(value: 'view' | 'edit') => setNewPermission(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" size="icon" onClick={addShare}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Current shares */}
          {shares.length > 0 && (
            <div className="space-y-2">
              <Label>Shared With</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {shares.map((share, index) => (
                  <div key={index} className="flex items-center space-x-2 p-2 border rounded">
                    <span className="flex-1 text-sm">{share.email}</span>
                    <Select 
                      value={share.permission} 
                      onValueChange={(value: 'view' | 'edit') => updatePermission(index, value)}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View</SelectItem>
                        <SelectItem value="edit">Edit</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => removeShare(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}