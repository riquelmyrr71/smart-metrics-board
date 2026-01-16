import React, { useState, useEffect, useMemo } from 'react';
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
  Swords,
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
import { format, addDays } from 'date-fns';
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

interface MonthlyProjection {
  diamonds_actual: number;
  creators_actual: number;
  month: number;
  year: number;
}

interface BattleData {
  [memberName: string]: {
    [date: string]: number;
  };
}

interface AgencyInfoCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgencyInfoCard: React.FC<AgencyInfoCardProps> = ({ isOpen, onClose }) => {
  const { agency } = useAgency();
  const [agencyDetails, setAgencyDetails] = useState<AgencyDetails | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [monthlyProjection, setMonthlyProjection] = useState<MonthlyProjection | null>(null);
  const [battleData, setBattleData] = useState<BattleData>({});
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
      // Load all data in parallel
      const [agencyResult, membersResult, projectionsResult, battlesResult] = await Promise.all([
        // Agency details
        supabase
          .from('agencies')
          .select('*')
          .eq('id', agency.id)
          .single(),
        // Team members
        supabase
          .from('agency_team_members')
          .select('*')
          .eq('agency_id', agency.id)
          .eq('is_active', true)
          .order('role', { ascending: false })
          .order('name'),
        // Current month projections
        supabase
          .from('monthly_projections')
          .select('diamonds_actual, creators_actual, month, year')
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1),
        // Battles data
        supabase
          .from('dashboard_data')
          .select('data')
          .eq('id', '00000000-0000-0000-0000-000000000005')
          .maybeSingle()
      ]);

      if (!agencyResult.error && agencyResult.data) {
        setAgencyDetails(agencyResult.data as unknown as AgencyDetails);
      }

      if (!membersResult.error && membersResult.data) {
        setTeamMembers(membersResult.data);
      }

      if (!projectionsResult.error && projectionsResult.data && projectionsResult.data.length > 0) {
        setMonthlyProjection(projectionsResult.data[0]);
      }

      if (!battlesResult.error && battlesResult.data?.data) {
        const parsed = battlesResult.data.data as { battleData?: BattleData };
        if (parsed.battleData) {
          setBattleData(parsed.battleData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados da agência:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate battles for next 7 days
  const battlesNext7Days = useMemo(() => {
    const today = new Date();
    let total = 0;
    
    for (let i = 0; i < 7; i++) {
      const dateStr = format(addDays(today, i), 'yyyy-MM-dd');
      Object.values(battleData).forEach(memberBattles => {
        total += memberBattles[dateStr] || 0;
      });
    }
    
    return total;
  }, [battleData]);

  if (!isOpen) return null;

  const executives = teamMembers.filter(m => m.role === 'executive');
  const associates = teamMembers.filter(m => m.role === 'associate');

  const getExecutiveName = (executiveId: string | null) => {
    if (!executiveId) return null;
    const exec = executives.find(e => e.id === executiveId);
    return exec?.name || null;
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toLocaleString('pt-BR');
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
                  {/* Stats Grid - Real Data */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                      <p className="text-lg font-bold">{monthlyProjection?.creators_actual || 0}</p>
                      <p className="text-[10px] text-muted-foreground">Criadores (mês)</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <Swords className="h-5 w-5 mx-auto text-red-500 mb-1" />
                      <p className="text-lg font-bold">{battlesNext7Days}</p>
                      <p className="text-[10px] text-muted-foreground">Batalhas (7 dias)</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                      <Diamond className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                      <p className="text-lg font-bold">
                        {formatNumber(monthlyProjection?.diamonds_actual || 0)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Diamantes (mês)</p>
                    </div>
                  </div>

                  {/* Month Reference */}
                  {monthlyProjection && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg py-2">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Dados de {format(new Date(monthlyProjection.year, monthlyProjection.month - 1), "MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  )}

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
                                {getInitials(exec.name)}
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
                            {getInitials(assoc.name)}
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
