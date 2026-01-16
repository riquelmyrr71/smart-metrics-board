import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  UserCheck, 
  Globe, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  TrendingUp,
  Diamond,
  Video,
  X,
  Loader2,
  Edit,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAgency } from '@/contexts/AgencyContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  executive_id: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  tiktok_username: string | null;
  is_active: boolean;
}

interface AgencyDetails {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  founded_at: string | null;
  total_creators: number;
  total_lives: number;
  total_diamonds: number;
  created_at: string;
}

interface AgencyInfoCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgencyInfoCard: React.FC<AgencyInfoCardProps> = ({ isOpen, onClose }) => {
  const { agency } = useAgency();
  const [agencyDetails, setAgencyDetails] = useState<AgencyDetails | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && agency?.id) {
      loadAgencyData();
    }
  }, [isOpen, agency?.id]);

  const loadAgencyData = async () => {
    if (!agency?.id) return;
    
    setIsLoading(true);
    try {
      // Load agency details
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .select('*')
        .eq('id', agency.id)
        .single();

      if (agencyError) throw agencyError;
      setAgencyDetails(agencyData as AgencyDetails);

      // Load team members
      const { data: membersData, error: membersError } = await supabase
        .from('agency_team_members')
        .select('*')
        .eq('agency_id', agency.id)
        .eq('is_active', true)
        .order('role', { ascending: false })
        .order('name');

      if (!membersError) {
        setTeamMembers(membersData || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados da agência:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const executives = teamMembers.filter(m => m.role === 'executive');
  const associates = teamMembers.filter(m => m.role === 'associate');

  const getExecutiveName = (executiveId: string | null) => {
    if (!executiveId) return null;
    const exec = executives.find(e => e.id === executiveId);
    return exec?.name || null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4 pointer-events-none">
      <Card className="w-[420px] max-h-[calc(100vh-5rem)] shadow-2xl border-border bg-card pointer-events-auto animate-in slide-in-from-right-5 duration-200">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{agencyDetails?.name || agency?.name}</CardTitle>
                <p className="text-xs text-muted-foreground">Informações da Agência</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="overview" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs"
                >
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger 
                  value="executives" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs"
                >
                  Executivos ({executives.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="associates" 
                  className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 text-xs"
                >
                  Associados ({associates.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px]">
                <TabsContent value="overview" className="p-4 space-y-4 mt-0">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                      <p className="text-lg font-bold">{agencyDetails?.total_creators || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Criadores</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <Video className="h-5 w-5 mx-auto text-tiktok mb-1" />
                      <p className="text-lg font-bold">{agencyDetails?.total_lives || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Lives</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <Diamond className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                      <p className="text-lg font-bold">
                        {(agencyDetails?.total_diamonds || 0).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Diamantes</p>
                    </div>
                  </div>

                  {/* Agency Info */}
                  <div className="space-y-3">
                    {agencyDetails?.description && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                        <p className="text-sm">{agencyDetails.description}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {agencyDetails?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs truncate">{agencyDetails.email}</span>
                        </div>
                      )}
                      {agencyDetails?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs">{agencyDetails.phone}</span>
                        </div>
                      )}
                      {agencyDetails?.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a href={agencyDetails.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                            {agencyDetails.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      {(agencyDetails?.city || agencyDetails?.state) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs">
                            {[agencyDetails.city, agencyDetails.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {agencyDetails?.founded_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">
                          Fundada em {format(new Date(agencyDetails.founded_at), "MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Team Summary */}
                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs font-medium mb-2">Equipe</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm">{executives.length} Executivos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{associates.length} Associados</span>
                      </div>
                    </div>
                  </div>

                  {/* Ideas Section */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Ideias & Próximos Passos</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                        <span className="text-xs">Aumentar meta de criadores em 20%</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="text-xs">Treinar novos associados</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="executives" className="p-4 space-y-3 mt-0">
                  {executives.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum executivo cadastrado</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Adicione executivos na página de Criadores
                      </p>
                    </div>
                  ) : (
                    executives.map((exec) => {
                      const teamMembers = associates.filter(a => a.executive_id === exec.id);
                      return (
                        <div key={exec.id} className="bg-muted/30 rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={exec.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                                {exec.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{exec.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  Executivo
                                </Badge>
                                <span>{teamMembers.length} associados</span>
                              </div>
                            </div>
                          </div>
                          {exec.email && (
                            <p className="text-xs text-muted-foreground mt-2 ml-13">{exec.email}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="associates" className="p-4 space-y-2 mt-0">
                  {associates.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhum associado cadastrado</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Adicione associados na página de Criadores
                      </p>
                    </div>
                  ) : (
                    associates.map((assoc) => (
                      <div key={assoc.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={assoc.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {assoc.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{assoc.name}</p>
                          {getExecutiveName(assoc.executive_id) && (
                            <p className="text-[10px] text-muted-foreground">
                              Equipe de {getExecutiveName(assoc.executive_id)}
                            </p>
                          )}
                        </div>
                        {assoc.tiktok_username && (
                          <Badge variant="outline" className="text-[10px]">
                            @{assoc.tiktok_username}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>
              </ScrollArea>

              {/* Footer */}
              <div className="p-3 border-t border-border">
                <Link to="/agencia" onClick={onClose}>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Gerenciar Agência
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgencyInfoCard;
