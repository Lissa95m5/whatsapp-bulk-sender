import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, TrendingUp, Users, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Contacts',
      value: stats?.total_contacts || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'Total Campaigns',
      value: stats?.total_campaigns || 0,
      icon: BarChart,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      title: 'Messages Sent',
      value: stats?.total_messages || 0,
      icon: MessageSquare,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      title: 'Delivered',
      value: stats?.delivered_messages || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      title: 'Failed',
      value: stats?.failed_messages || 0,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50'
    },
    {
      title: 'Delivery Rate',
      value: `${stats?.delivery_rate?.toFixed(1) || 0}%`,
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    }
  ];

  return (
    <div className="space-y-6" data-testid="dashboard">
      <div>
        <h1 className="text-4xl font-bold tracking-tight font-['Plus_Jakarta_Sans'] mb-2">
          Dashboard
        </h1>
        <p className="text-zinc-600 font-['Inter']">
          Overview of your WhatsApp messaging campaigns
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="p-6 hover:shadow-md transition-shadow"
              data-testid={`stat-card-${stat.title.toLowerCase().replace(' ', '-')}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500 font-mono mb-1">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold font-['JetBrains_Mono'] tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {stats?.recent_campaigns && stats.recent_campaigns.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold tracking-tight font-['Plus_Jakarta_Sans'] mb-4">
            Recent Campaigns
          </h2>
          <div className="space-y-3">
            {stats.recent_campaigns.map((campaign, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg"
                data-testid={`recent-campaign-${index}`}
              >
                <div className="flex-1">
                  <p className="font-medium font-['Inter']">{campaign.name}</p>
                  <p className="text-sm text-zinc-500 font-mono">
                    {campaign.total_recipients} recipients • {campaign.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600 font-mono">
                    {campaign.successful_sends} sent
                  </p>
                  {campaign.failed_sends > 0 && (
                    <p className="text-sm text-red-600 font-mono">
                      {campaign.failed_sends} failed
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
