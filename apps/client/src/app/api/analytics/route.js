// src/app/api/analytics/route.js - Analytics dashboard API
import { 
    getAnalyticsDashboard, 
    generateSystemRecommendations, 
    exportAnalytics,
    checkAlerts,
    cleanupAnalytics,
    identifyHallucinationRisks 
} from '@/lib/monitoring';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action') || 'dashboard';
        const format = searchParams.get('format') || 'json';
        
        switch (action) {
            case 'dashboard':
                const dashboard = getAnalyticsDashboard();
                return Response.json(dashboard);
                
            case 'recommendations':
                const recommendations = generateSystemRecommendations();
                return Response.json({ recommendations });
                
            case 'alerts':
                const alerts = checkAlerts();
                return Response.json({ alerts, count: alerts.length });
                
            case 'risks':
                const risks = identifyHallucinationRisks();
                return Response.json({ risks });
                
            case 'export':
                const exportData = exportAnalytics(format);
                const headers = {
                    'Content-Type': format === 'csv' ? 'text/csv' : 'application/json',
                    'Content-Disposition': `attachment; filename="rag-analytics-${new Date().toISOString().split('T')[0]}.${format}"`
                };
                return new Response(exportData, { headers });
                
            case 'health':
                const healthData = {
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    alerts: checkAlerts(),
                    uptime: process.uptime(),
                    memory: process.memoryUsage()
                };
                return Response.json(healthData);
                
            default:
                return Response.json({ error: 'Unknown action' }, { status: 400 });
        }
        
    } catch (error) {
        console.error('[Analytics API Error]', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const { action, ...params } = await req.json();
        
        switch (action) {
            case 'cleanup':
                const daysToKeep = params.daysToKeep || 30;
                const cleanupResult = cleanupAnalytics(daysToKeep);
                return Response.json({ 
                    message: 'Cleanup completed',
                    ...cleanupResult 
                });
                
            default:
                return Response.json({ error: 'Unknown action' }, { status: 400 });
        }
        
    } catch (error) {
        console.error('[Analytics API Error]', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}