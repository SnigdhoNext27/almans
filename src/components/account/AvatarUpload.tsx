import { useState, useRef } from 'react';
import { Camera, Loader2, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AvatarUploadProps {
  avatarUrl: string | null;
  userId: string;
  fullName: string | null;
  onAvatarChange: (url: string) => void;
}

export function AvatarUpload({ avatarUrl, userId, fullName, onAvatarChange }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please upload an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast({ title: 'Image must be less than 1MB', variant: 'destructive' });
      return;
    }

    // Validate extension
    const allowedExtensions = ['jpg', 'jpeg', 'png'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      toast({ title: 'Only JPG and PNG images are allowed', variant: 'destructive' });
      return;
    }

    setUploading(true);

    try {
      // Delete old avatar if exists
      if (avatarUrl) {
        const oldPath = avatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const fileName = `${userId}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting timestamp
      const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarChange(newUrl);
      toast({ title: 'Profile photo updated!' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Failed to upload photo', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-28 w-28 border-4 border-border">
          <AvatarImage src={avatarUrl || undefined} alt={fullName || 'User'} />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors ${!avatarUrl ? 'avatar-prompt-pulse' : ''}`}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleUpload}
        className="hidden"
      />

      <div className="text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Select Image
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          File size: max 1 MB<br />
          Format: .JPEG, .PNG
        </p>
      </div>
    </div>
  );
}
