
'use client';

import type { Reference } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Trash2, Copy, Edit3, Youtube, FileText, UserCircle } from 'lucide-react'; // Added UserCircle
import { motion } from 'framer-motion';
import { formatDistanceToNow, parseISO } from 'date-fns'; // parseISO was missing
import { useToast } from '@/hooks/use-toast';

interface ReferenceItemProps {
  reference: Reference & { userId: string }; // userId here is expected to be user's name for admin display
  onDelete: (id: string) => void;
  isAdminView?: boolean; // To conditionally show owner
}

export function ReferenceItem({ reference, onDelete, isAdminView = false }: ReferenceItemProps) {
  const { toast } = useToast();

  const copyLink = () => {
    navigator.clipboard.writeText(reference.link);
    toast({ title: "Link Copied!", description: reference.link, variant: "default" });
  };

  const getIcon = () => {
    if (reference.link.includes('youtube.com') || reference.link.includes('youtu.be')) {
      return <Youtube className="h-5 w-5 text-red-600" />;
    }
    return <FileText className="h-5 w-5 text-primary" />;
  };

  return (
    // motion.div is handled by the parent page now for grid layout
    <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-300 bg-card border-border h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <CardTitle className="text-lg font-semibold text-foreground leading-tight hover:text-primary">
              <a href={reference.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {reference.title}
              </a>
            </CardTitle>
          </div>
           {reference.aiSuggested && <Badge variant="outline" className="text-xs border-accent text-accent">AI Suggested</Badge>}
        </div>
        <CardDescription className="text-xs text-muted-foreground pt-1 space-y-0.5">
          {isAdminView && <div className="flex items-center"><UserCircle className="h-3 w-3 mr-1"/>Owner: {reference.userId}</div>}
          <div>Added {formatDistanceToNow(parseISO(reference.createdAt), { addSuffix: true })}
            {reference.category && ` • ${reference.category}`}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
          {reference.notes && (
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">{reference.notes}</p>
          )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0 pt-4 mt-auto">
        <div className="flex flex-wrap gap-2">
          {reference.tags?.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs bg-secondary text-secondary-foreground">{tag}</Badge>
          ))}
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" onClick={copyLink} title="Copy Link">
            <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </Button>
          <a href={reference.link} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" title="Open Link">
              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
            </Button>
          </a>
          <Button variant="ghost" size="icon" onClick={() => onDelete(reference.id)} title="Delete Reference">
            <Trash2 className="h-4 w-4 text-destructive/70 hover:text-destructive" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
