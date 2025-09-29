// src/lib/monitoring.js - Monitoring and analytics for RAG performance
"use server";

// In-memory analytics store (use Redis/database in production)
const analyticsStore = {
    queries: [],
    performance: {},
    errors: []
};

/**
 * Logs a query and its performance metrics
 * @param {Object} queryData 
 */
export async function logQuery(queryData) {
    const timestamp = Date.now();
    const entry = {
        timestamp,
        query: queryData.query,
        entities: queryData.entities,
        ragResults: queryData.ragResults?.length || 0,
        wikiResults: queryData.wikiResults?.length || 0,
        maxSimilarity: queryData.maxSimilarity || 0,
        qualityScore: queryData.qualityScore || 0,
        responseTime: queryData.responseTime || 0,
        confidenceLevel: queryData.confidenceLevel || 'unknown',
        hadHallucinations: queryData.hadHallucinations || false,
        sourceConflicts: queryData.sourceConflicts || 0
    };
    
    analyticsStore.queries.push(entry);
    
    // Keep only last 1000 queries to prevent memory bloat
    if (analyticsStore.queries.length > 1000) {
        analyticsStore.queries = analyticsStore.queries.slice(-1000);
    }
    
    console.log(`[Analytics] Logged query: ${queryData.query.substring(0, 50)}...`);
}

/**
 * Logs performance metrics
 * @param {string} operation 
 * @param {number} duration 
 * @param {Object} metadata 
 */
export async function logPerformance(operation, duration, metadata = {}) {
    if (!analyticsStore.performance[operation]) {
        analyticsStore.performance[operation] = {
            count: 0,
            totalTime: 0,
            averageTime: 0,
            minTime: Infinity,
            maxTime: 0,
            errors: 0
        };
    }
    
    const perf = analyticsStore.performance[operation];
    perf.count++;
    perf.totalTime += duration;
    perf.averageTime = perf.totalTime / perf.count;
    perf.minTime = Math.min(perf.minTime, duration);
    perf.maxTime = Math.max(perf.maxTime, duration);
    
    if (metadata.error) {
        perf.errors++;
    }
}

/**
 * Gets analytics dashboard data
 * @returns {Promise<Object>} Analytics summary
 */
export async function getAnalyticsDashboard() {
    const recentQueries = analyticsStore.queries.slice(-100);
    const last24Hours = analyticsStore.queries.filter(q => 
        Date.now() - q.timestamp < 24 * 60 * 60 * 1000
    );
    
    return {
        overview: {
            totalQueries: analyticsStore.queries.length,
            queriesLast24h: last24Hours.length,
            averageQualityScore: calculateAverage(recentQueries, 'qualityScore'),
            averageResponseTime: calculateAverage(recentQueries, 'responseTime'),
            hallucinationRate: calculateRate(recentQueries, 'hadHallucinations'),
            highConfidenceRate: calculateRate(recentQueries, q => q.confidenceLevel === 'high')
        },
        qualityMetrics: {
            averageRAGResults: calculateAverage(recentQueries, 'ragResults'),
            averageWikiResults: calculateAverage(recentQueries, 'wikiResults'),
            averageSimilarity: calculateAverage(recentQueries, 'maxSimilarity'),
            sourceConflictRate: calculateRate(recentQueries, q => q.sourceConflicts > 0)
        },
        performance: analyticsStore.performance,
        trends: calculateTrends(analyticsStore.queries),
        commonIssues: identifyCommonIssues(recentQueries)
    };
}

/**
 * Identifies patterns that might indicate hallucination risks
 * @param {Array} queries 
 * @returns {Promise<Array>} Risk indicators
 */
export async function identifyHallucinationRisks(queries = analyticsStore.queries.slice(-100)) {
    const risks = [];
    
    // Low similarity threshold
    const lowSimilarityQueries = queries.filter(q => q.maxSimilarity < 0.3);
    if (lowSimilarityQueries.length / queries.length > 0.2) {
        risks.push({
            type: 'low_similarity',
            severity: 'medium',
            description: `${Math.round(lowSimilarityQueries.length / queries.length * 100)}% of queries have very low similarity scores`,
            recommendation: 'Consider improving embedding model or expanding knowledge base'
        });
    }
    
    // High hallucination rate
    const hallucinatedQueries = queries.filter(q => q.hadHallucinations);
    if (hallucinatedQueries.length / queries.length > 0.1) {
        risks.push({
            type: 'high_hallucination_rate',
            severity: 'high',
            description: `${Math.round(hallucinatedQueries.length / queries.length * 100)}% of queries had detected hallucinations`,
            recommendation: 'Review and strengthen hallucination detection system'
        });
    }
    
    // Frequent source conflicts
    const conflictQueries = queries.filter(q => q.sourceConflicts > 0);
    if (conflictQueries.length / queries.length > 0.15) {
        risks.push({
            type: 'source_conflicts',
            severity: 'medium',
            description: `${Math.round(conflictQueries.length / queries.length * 100)}% of queries had source conflicts`,
            recommendation: 'Review data sources for consistency and accuracy'
        });
    }
    
    return risks;
}

/**
 * Generates recommendations for system improvements
 * @returns {Promise<Array>} Improvement recommendations
 */
export async function generateSystemRecommendations() {
    const dashboard = await getAnalyticsDashboard();
    const risks = await identifyHallucinationRisks();
    const recommendations = [];
    
    // Performance recommendations
    if (dashboard.overview.averageResponseTime > 3000) {
        recommendations.push({
            category: 'performance',
            priority: 'high',
            title: 'Slow Response Times',
            description: `Average response time is ${(dashboard.overview.averageResponseTime / 1000).toFixed(1)}s`,
            actions: [
                'Implement embedding caching',
                'Optimize Pinecone query parameters',
                'Consider parallel processing improvements'
            ]
        });
    }
    
    // Quality recommendations
    if (dashboard.overview.averageQualityScore < 0.7) {
        recommendations.push({
            category: 'quality',
            priority: 'high',
            title: 'Low Quality Scores',
            description: `Average quality score is ${dashboard.overview.averageQualityScore.toFixed(2)}`,
            actions: [
                'Improve source material quality',
                'Enhance entity extraction',
                'Strengthen validation rules'
            ]
        });
    }
    
    // Coverage recommendations
    if (dashboard.qualityMetrics.averageRAGResults < 2) {
        recommendations.push({
            category: 'coverage',
            priority: 'medium',
            title: 'Low RAG Result Coverage',
            description: `Average RAG results per query: ${dashboard.qualityMetrics.averageRAGResults.toFixed(1)}`,
            actions: [
                'Expand knowledge base',
                'Implement query expansion',
                'Lower similarity threshold for broader matching'
            ]
        });
    }
    
    // Add risk-based recommendations
    risks.forEach(risk => {
        recommendations.push({
            category: 'risk_mitigation',
            priority: risk.severity,
            title: risk.type.replace('_', ' ').toUpperCase(),
            description: risk.description,
            actions: [risk.recommendation]
        });
    });
    
    return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
}

/**
 * Exports analytics data for external analysis
 * @param {string} format - 'json' or 'csv'
 * @returns {Promise<string>} Formatted data
 */
export async function exportAnalytics(format = 'json') {
    const data = {
        exportTime: new Date().toISOString(),
        dashboard: await getAnalyticsDashboard(),
        risks: await identifyHallucinationRisks(),
        recommendations: await generateSystemRecommendations(),
        rawQueries: analyticsStore.queries.slice(-500) // Last 500 queries
    };
    
    if (format === 'json') {
        return JSON.stringify(data, null, 2);
    }
    
    if (format === 'csv') {
        const csvRows = [
            'timestamp,query,ragResults,wikiResults,maxSimilarity,qualityScore,responseTime,confidenceLevel,hadHallucinations,sourceConflicts'
        ];
        
        data.rawQueries.forEach(query => {
            csvRows.push([
                new Date(query.timestamp).toISOString(),
                `"${query.query.replace(/"/g, '""')}"`,
                query.ragResults,
                query.wikiResults,
                query.maxSimilarity.toFixed(3),
                query.qualityScore.toFixed(3),
                query.responseTime,
                query.confidenceLevel,
                query.hadHallucinations,
                query.sourceConflicts
            ].join(','));
        });
        
        return csvRows.join('\n');
    }
    
    throw new Error(`Unsupported export format: ${format}`);
}

/**
 * Real-time monitoring for alert conditions
 * @returns {Promise<Array>} Active alerts
 */
export async function checkAlerts() {
    const alerts = [];
    const recentQueries = analyticsStore.queries.slice(-50); // Last 50 queries
    
    if (recentQueries.length === 0) return alerts;
    
    // High error rate alert
    const recentErrors = recentQueries.filter(q => q.qualityScore < 0.5).length;
    if (recentErrors / recentQueries.length > 0.3) {
        alerts.push({
            type: 'high_error_rate',
            severity: 'critical',
            message: `${Math.round(recentErrors / recentQueries.length * 100)}% of recent queries had low quality scores`,
            timestamp: Date.now()
        });
    }
    
    // Performance degradation alert
    const recentAvgTime = calculateAverage(recentQueries, 'responseTime');
    const historicalAvgTime = calculateAverage(analyticsStore.queries.slice(-200, -50), 'responseTime');
    
    if (recentAvgTime > historicalAvgTime * 1.5 && recentAvgTime > 2000) {
        alerts.push({
            type: 'performance_degradation',
            severity: 'warning',
            message: `Response time increased by ${Math.round((recentAvgTime / historicalAvgTime - 1) * 100)}%`,
            timestamp: Date.now()
        });
    }
    
    // Hallucination spike alert
    const recentHallucinations = recentQueries.filter(q => q.hadHallucinations).length;
    if (recentHallucinations > 5) {
        alerts.push({
            type: 'hallucination_spike',
            severity: 'critical',
            message: `${recentHallucinations} hallucinations detected in last 50 queries`,
            timestamp: Date.now()
        });
    }
    
    return alerts;
}

/**
 * Clears old analytics data
 * @param {number} daysToKeep 
 */
export async function cleanupAnalytics(daysToKeep = 30) {
    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const initialCount = analyticsStore.queries.length;
    
    analyticsStore.queries = analyticsStore.queries.filter(q => q.timestamp > cutoffTime);
    analyticsStore.errors = analyticsStore.errors.filter(e => e.timestamp > cutoffTime);
    
    const removedCount = initialCount - analyticsStore.queries.length;
    console.log(`[Analytics Cleanup] Removed ${removedCount} old entries, keeping ${analyticsStore.queries.length} recent entries`);
    
    return { removed: removedCount, remaining: analyticsStore.queries.length };
}

// Helper functions

function calculateAverage(array, property) {
    if (array.length === 0) return 0;
    const sum = array.reduce((acc, item) => {
        const value = typeof property === 'string' ? item[property] : property(item);
        return acc + (value || 0);
    }, 0);
    return sum / array.length;
}

function calculateRate(array, condition) {
    if (array.length === 0) return 0;
    const matches = array.filter(item => 
        typeof condition === 'string' ? item[condition] : condition(item)
    ).length;
    return matches / array.length;
}

function calculateTrends(queries) {
    if (queries.length < 10) return {};
    
    const periods = [
        { name: 'last_hour', ms: 60 * 60 * 1000 },
        { name: 'last_day', ms: 24 * 60 * 60 * 1000 },
        { name: 'last_week', ms: 7 * 24 * 60 * 60 * 1000 }
    ];
    
    const trends = {};
    const now = Date.now();
    
    periods.forEach(period => {
        const periodQueries = queries.filter(q => now - q.timestamp <= period.ms);
        if (periodQueries.length > 0) {
            trends[period.name] = {
                count: periodQueries.length,
                avgQuality: calculateAverage(periodQueries, 'qualityScore'),
                avgSimilarity: calculateAverage(periodQueries, 'maxSimilarity'),
                hallucinationRate: calculateRate(periodQueries, 'hadHallucinations')
            };
        }
    });
    
    return trends;
}

function identifyCommonIssues(queries) {
    const issues = [];
    
    // Analyze query patterns
    const queryTypes = {};
    const entityCounts = {};
    
    queries.forEach(query => {
        // Categorize query types
        const queryText = query.query.toLowerCase();
        let category = 'general';
        
        if (queryText.includes('what is') || queryText.includes('who is')) {
            category = 'definition';
        } else if (queryText.includes('how much') || queryText.includes('worth') || queryText.includes('revenue')) {
            category = 'financial';
        } else if (queryText.includes('when') || queryText.includes('history')) {
            category = 'historical';
        }
        
        queryTypes[category] = (queryTypes[category] || 0) + 1;
        
        // Track entity extraction success
        if (query.entities && query.entities.length > 0) {
            entityCounts[query.entities.length] = (entityCounts[query.entities.length] || 0) + 1;
        }
    });
    
    // Identify problematic patterns
    const lowQualityQueries = queries.filter(q => q.qualityScore < 0.6);
    if (lowQualityQueries.length > queries.length * 0.2) {
        issues.push({
            type: 'quality',
            description: `${Math.round(lowQualityQueries.length / queries.length * 100)}% of queries have quality issues`,
            severity: 'medium',
            affectedQueries: lowQualityQueries.length
        });
    }
    
    const noRAGResults = queries.filter(q => q.ragResults === 0);
    if (noRAGResults.length > queries.length * 0.3) {
        issues.push({
            type: 'coverage',
            description: `${Math.round(noRAGResults.length / queries.length * 100)}% of queries found no RAG results`,
            severity: 'high',
            affectedQueries: noRAGResults.length
        });
    }
    
    return issues;
}

/**
 * Performance monitoring middleware
 * @param {string} operation 
 * @returns {Object} Timer object with end function
 */
export async function startTimer(operation) {
    const startTime = Date.now();
    return {
        end: async (metadata = {}) => {
            const duration = Date.now() - startTime;
            await logPerformance(operation, duration, metadata);
            return duration;
        }
    };
}