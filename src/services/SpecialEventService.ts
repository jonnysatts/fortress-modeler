import { supabase } from '@/lib/supabase';
import { 
  SpecialEvent, 
  SpecialEventForecast, 
  SpecialEventActual, 
  SpecialEventSummary,
  SpecialEventFormData,
  SpecialEventForecastFormData,
  SpecialEventActualFormData,
  SpecialEventApiResponse,
  SpecialEventsListResponse,
  EventVariance,
  SpecialEventWithVariance
} from '@/types/specialEvents';

interface EventDataJson {
  estimated_attendance?: number;
  venue?: string;
  event_start_date?: string;
  event_end_date?: string;
  sponsorship_target?: number;
  event_scope?: string;
}

export class SpecialEventService {
  // Special Events CRUD Operations
  static async createSpecialEvent(data: SpecialEventFormData): Promise<SpecialEvent> {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: event, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: data.name,
        product_type: 'special',
        description: data.description,
        data: {
          estimated_attendance: data.estimatedAttendance,
          venue: data.venue,
          event_start_date: data.eventStartDate,
          event_end_date: data.eventEndDate,
          sponsorship_target: data.sponsorshipTarget,
          event_scope: data.eventScope
        },
        event_type: 'special',
        event_date: data.eventStartDate,
        event_end_date: data.eventEndDate
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: event.id,
      name: event.name,
      description: event.description || undefined,
      type: 'special',
      estimatedAttendance: data.estimatedAttendance,
      venue: data.venue,
      eventStartDate: data.eventStartDate,
      eventEndDate: data.eventEndDate,
      sponsorshipTarget: data.sponsorshipTarget,
      eventScope: data.eventScope,
      createdAt: event.created_at || new Date().toISOString(),
      updatedAt: event.updated_at || new Date().toISOString()
    };
  }

  static async getSpecialEvent(id: string): Promise<SpecialEventApiResponse> {
    const [eventResult, forecastResult, actualResult] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('special_event_forecasts').select('*').eq('project_id', id).single(),
      supabase.from('special_event_actuals').select('*').eq('project_id', id).single()
    ]);

    if (eventResult.error) throw eventResult.error;

    const eventData = eventResult.data;
    const eventDataJson = (eventData.data || {}) as EventDataJson;
    
    const event: SpecialEvent = {
      id: eventData.id,
      name: eventData.name,
      description: eventData.description || undefined,
      type: 'special',
      estimatedAttendance: eventDataJson.estimated_attendance || 0,
      venue: eventDataJson.venue || '',
      eventStartDate: eventDataJson.event_start_date || eventData.event_date || '',
      eventEndDate: eventDataJson.event_end_date || eventData.event_end_date || '',
      sponsorshipTarget: eventDataJson.sponsorship_target || 0,
      eventScope: eventDataJson.event_scope || '',
      createdAt: eventData.created_at || new Date().toISOString(),
      updatedAt: eventData.updated_at || new Date().toISOString()
    };

    const forecast: SpecialEventForecast | undefined = forecastResult.data ? {
      id: forecastResult.data.id || '',
      productId: forecastResult.data.project_id || '',
      forecastDate: new Date().toISOString(),
      revenueTickets: forecastResult.data.forecast_ticket_sales || 0,
      revenueFnB: forecastResult.data.forecast_fnb_revenue || 0,
      revenueMerchandise: forecastResult.data.forecast_merch_revenue || 0,
      revenueSponsorship: forecastResult.data.forecast_sponsorship_income || 0,
      costStaffing: 0,
      costVenue: 0,
      costVendors: 0,
      costMarketing: 0,
      costProduction: 0,
      costOther: forecastResult.data.forecast_total_costs || 0,
      createdAt: forecastResult.data.created_at || new Date().toISOString(),
      updatedAt: forecastResult.data.created_at || new Date().toISOString()
    } : undefined;

    const actual: SpecialEventActual | undefined = actualResult.data ? {
      id: actualResult.data.id || '',
      productId: actualResult.data.project_id || '',
      actualDate: new Date().toISOString(),
      actualRevenueTickets: 0,
      actualRevenueFnB: actualResult.data.actual_fnb_revenue || 0,
      actualRevenueMerchandise: actualResult.data.actual_merch_revenue || 0,
      actualRevenueSponsorship: actualResult.data.actual_sponsorship_income || 0,
      actualCostStaffing: 0,
      actualCostVenue: 0,
      actualCostVendors: 0,
      actualCostMarketing: 0,
      actualCostProduction: 0,
      actualCostOther: 0,
      actualAttendance: 0,
      notes: actualResult.data.notes || undefined,
      createdAt: actualResult.data.created_at || new Date().toISOString(),
      updatedAt: actualResult.data.created_at || new Date().toISOString()
    } : undefined;

    return {
      data: event,
      forecast,
      actual
    };
  }

  static async updateSpecialEvent(id: string, data: Partial<SpecialEventFormData>): Promise<SpecialEvent> {
    // First get existing event to merge data
    const { data: existingEvent, error: fetchError } = await supabase
      .from('projects')
      .select('data')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const existingData = (existingEvent.data || {}) as EventDataJson;
    const updatedData: EventDataJson = {
      ...existingData,
      ...(data.estimatedAttendance !== undefined && { estimated_attendance: data.estimatedAttendance }),
      ...(data.venue && { venue: data.venue }),
      ...(data.eventStartDate && { event_start_date: data.eventStartDate }),
      ...(data.eventEndDate && { event_end_date: data.eventEndDate }),
      ...(data.sponsorshipTarget !== undefined && { sponsorship_target: data.sponsorshipTarget }),
      ...(data.eventScope && { event_scope: data.eventScope })
    };

    const updateFields: any = {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      data: updatedData,
      updated_at: new Date().toISOString()
    };

    const { data: event, error } = await supabase
      .from('projects')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    const eventDataJson = (event.data || {}) as EventDataJson;
    
    return {
      id: event.id,
      name: event.name,
      description: event.description || undefined,
      type: 'special',
      estimatedAttendance: eventDataJson.estimated_attendance || 0,
      venue: eventDataJson.venue || '',
      eventStartDate: eventDataJson.event_start_date || event.event_date || '',
      eventEndDate: eventDataJson.event_end_date || event.event_end_date || '',
      sponsorshipTarget: eventDataJson.sponsorship_target || 0,
      eventScope: eventDataJson.event_scope || '',
      createdAt: event.created_at || new Date().toISOString(),
      updatedAt: event.updated_at || new Date().toISOString()
    };
  }

  static async deleteSpecialEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getSpecialEvents(): Promise<SpecialEventsListResponse> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error, count } = await supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('product_type', 'special')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const events: SpecialEventSummary[] = (data || []).map(event => {
      const eventDataJson = (event.data || {}) as EventDataJson;
      return {
        id: event.id,
        name: event.name,
        description: event.description || undefined,
        type: 'special',
        estimatedAttendance: eventDataJson.estimated_attendance || 0,
        venue: eventDataJson.venue || '',
        eventStartDate: eventDataJson.event_start_date || event.event_date || '',
        eventEndDate: eventDataJson.event_end_date || event.event_end_date || '',
        sponsorshipTarget: eventDataJson.sponsorship_target || 0,
        eventScope: eventDataJson.event_scope || '',
        createdAt: event.created_at || new Date().toISOString(),
        updatedAt: event.updated_at || new Date().toISOString()
      };
    });

    return {
      data: events,
      total: count || 0
    };
  }

  // Forecast Operations
  static async createForecast(projectId: string, data: SpecialEventForecastFormData): Promise<SpecialEventForecast> {
    const { data: forecast, error } = await supabase
      .from('special_event_forecasts')
      .insert({
        project_id: projectId,
        // Revenue fields
        forecast_ticket_sales: data.revenueTickets,
        forecast_fnb_revenue: data.revenueFnB,
        forecast_merch_revenue: data.revenueMerchandise,
        forecast_sponsorship_income: data.revenueSponsorship,
        forecast_other_income: data.revenueOther || 0,
        
        // Cost breakdown fields
        forecast_staffing_costs: data.costStaffing,
        forecast_venue_costs: data.costVenue,
        forecast_vendor_costs: data.costVendors,
        forecast_marketing_costs: data.costMarketing,
        forecast_production_costs: data.costProduction,
        forecast_other_costs: data.costOther,
        
        // Marketing budget fields
        marketing_email_budget: data.marketingEmailBudget || 0,
        marketing_social_budget: data.marketingSocialBudget || 0,
        marketing_influencer_budget: data.marketingInfluencerBudget || 0,
        marketing_paid_ads_budget: data.marketingPaidAdsBudget || 0,
        marketing_content_budget: data.marketingContentBudget || 0,
        marketing_strategy: data.marketingStrategy || '',
        
        // Event details
        estimated_attendance: data.estimatedAttendance || 0,
        ticket_price: data.ticketPrice || 0,
        
        // Notes fields
        revenue_notes: data.revenueNotes || '',
        cost_notes: data.costNotes || '',
        marketing_notes: data.marketingNotes || '',
        general_notes: data.generalNotes || ''
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: forecast.id,
      productId: forecast.project_id,
      forecastDate: forecast.created_at || new Date().toISOString(),
      revenueTickets: forecast.forecast_ticket_sales || 0,
      revenueFnB: forecast.forecast_fnb_revenue || 0,
      revenueMerchandise: forecast.forecast_merch_revenue || 0,
      revenueSponsorship: forecast.forecast_sponsorship_income || 0,
      costStaffing: forecast.forecast_staffing_costs || 0,
      costVenue: forecast.forecast_venue_costs || 0,
      costVendors: forecast.forecast_vendor_costs || 0,
      costMarketing: forecast.forecast_marketing_costs || 0,
      costProduction: forecast.forecast_production_costs || 0,
      costOther: forecast.forecast_other_costs || 0,
      createdAt: forecast.created_at || new Date().toISOString(),
      updatedAt: forecast.created_at || new Date().toISOString()
    };
  }

  static async updateForecast(projectId: string, data: SpecialEventForecastFormData): Promise<SpecialEventForecast> {
    const { data: forecast, error } = await supabase
      .from('special_event_forecasts')
      .update({
        forecast_ticket_sales: data.revenueTickets,
        forecast_fnb_revenue: data.revenueFnB,
        forecast_merch_revenue: data.revenueMerchandise,
        forecast_sponsorship_income: data.revenueSponsorship,
        forecast_total_costs: data.costStaffing + data.costVenue + data.costVendors + data.costMarketing + data.costProduction + data.costOther
      })
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: forecast.id,
      productId: forecast.project_id,
      forecastDate: new Date().toISOString(),
      revenueTickets: forecast.forecast_ticket_sales || 0,
      revenueFnB: forecast.forecast_fnb_revenue || 0,
      revenueMerchandise: forecast.forecast_merch_revenue || 0,
      revenueSponsorship: forecast.forecast_sponsorship_income || 0,
      costStaffing: data.costStaffing,
      costVenue: data.costVenue,
      costVendors: data.costVendors,
      costMarketing: data.costMarketing,
      costProduction: data.costProduction,
      costOther: data.costOther,
      createdAt: forecast.created_at || new Date().toISOString(),
      updatedAt: forecast.created_at || new Date().toISOString()
    };
  }

  // Actual Operations
  static async createActual(projectId: string, data: SpecialEventActualFormData): Promise<SpecialEventActual> {
    const { data: actual, error } = await supabase
      .from('special_event_actuals')
      .insert({
        project_id: projectId,
        actual_fnb_revenue: data.actualRevenueFnB,
        actual_merch_revenue: data.actualRevenueMerchandise,
        actual_sponsorship_income: data.actualRevenueSponsorship,
        actual_total_costs: data.actualCostStaffing + data.actualCostVenue + data.actualCostVendors + data.actualCostMarketing + data.actualCostProduction + data.actualCostOther,
        notes: data.notes
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: actual.id,
      productId: actual.project_id,
      actualDate: new Date().toISOString(),
      actualRevenueTickets: data.actualRevenueTickets,
      actualRevenueFnB: actual.actual_fnb_revenue || 0,
      actualRevenueMerchandise: actual.actual_merch_revenue || 0,
      actualRevenueSponsorship: actual.actual_sponsorship_income || 0,
      actualCostStaffing: data.actualCostStaffing,
      actualCostVenue: data.actualCostVenue,
      actualCostVendors: data.actualCostVendors,
      actualCostMarketing: data.actualCostMarketing,
      actualCostProduction: data.actualCostProduction,
      actualCostOther: data.actualCostOther,
      actualAttendance: data.actualAttendance,
      notes: actual.notes || undefined,
      createdAt: actual.created_at || new Date().toISOString(),
      updatedAt: actual.created_at || new Date().toISOString()
    };
  }

  static async updateActual(projectId: string, data: SpecialEventActualFormData): Promise<SpecialEventActual> {
    const { data: actual, error } = await supabase
      .from('special_event_actuals')
      .update({
        actual_fnb_revenue: data.actualRevenueFnB,
        actual_merch_revenue: data.actualRevenueMerchandise,
        actual_sponsorship_income: data.actualRevenueSponsorship,
        actual_total_costs: data.actualCostStaffing + data.actualCostVenue + data.actualCostVendors + data.actualCostMarketing + data.actualCostProduction + data.actualCostOther,
        notes: data.notes
      })
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: actual.id,
      productId: actual.project_id,
      actualDate: new Date().toISOString(),
      actualRevenueTickets: data.actualRevenueTickets,
      actualRevenueFnB: actual.actual_fnb_revenue || 0,
      actualRevenueMerchandise: actual.actual_merch_revenue || 0,
      actualRevenueSponsorship: actual.actual_sponsorship_income || 0,
      actualCostStaffing: data.actualCostStaffing,
      actualCostVenue: data.actualCostVenue,
      actualCostVendors: data.actualCostVendors,
      actualCostMarketing: data.actualCostMarketing,
      actualCostProduction: data.actualCostProduction,
      actualCostOther: data.actualCostOther,
      actualAttendance: data.actualAttendance,
      notes: actual.notes || undefined,
      createdAt: actual.created_at || new Date().toISOString(),
      updatedAt: actual.created_at || new Date().toISOString()
    };
  }

  // Summary and Analysis
  static async getSpecialEventSummary(id: string): Promise<SpecialEventSummary> {
    const [eventResult, forecastResult, actualResult] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('special_event_forecasts').select('*').eq('project_id', id).single(),
      supabase.from('special_event_actuals').select('*').eq('project_id', id).single()
    ]);

    if (eventResult.error) throw eventResult.error;

    const eventData = eventResult.data;
    const eventDataJson = (eventData.data || {}) as EventDataJson;

    const forecast = forecastResult.data;
    const actual = actualResult.data;

    const totalForecastRevenue = (forecast?.forecast_ticket_sales || 0) + 
                                 (forecast?.forecast_fnb_revenue || 0) + 
                                 (forecast?.forecast_merch_revenue || 0) + 
                                 (forecast?.forecast_sponsorship_income || 0);
    
    const totalForecastCost = forecast?.forecast_total_costs || 0;
    const forecastProfit = totalForecastRevenue - totalForecastCost;

    const totalActualRevenue = (actual?.actual_fnb_revenue || 0) + 
                               (actual?.actual_merch_revenue || 0) + 
                               (actual?.actual_sponsorship_income || 0);
    
    const totalActualCost = actual?.actual_total_costs || 0;
    const actualProfit = totalActualRevenue - totalActualCost;

    return {
      id: eventData.id,
      name: eventData.name,
      description: eventData.description || undefined,
      type: 'special',
      estimatedAttendance: eventDataJson.estimated_attendance || 0,
      venue: eventDataJson.venue || '',
      eventStartDate: eventDataJson.event_start_date || eventData.event_date || '',
      eventEndDate: eventDataJson.event_end_date || eventData.event_end_date || '',
      sponsorshipTarget: eventDataJson.sponsorship_target || 0,
      eventScope: eventDataJson.event_scope || '',
      createdAt: eventData.created_at || new Date().toISOString(),
      updatedAt: eventData.updated_at || new Date().toISOString()
    };
  }

  static async getAllSpecialEventsSummary(): Promise<SpecialEventSummary[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: events, error } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_type', 'special');

    if (error) throw error;

    const summaries = await Promise.all(
      (events || []).map(event => this.getSpecialEventSummary(event.id))
    );

    return summaries;
  }

  static calculateVariance(forecast: SpecialEventForecast, actual: SpecialEventActual): EventVariance {
    const totalForecastRevenue = forecast.revenueTickets + forecast.revenueFnB + forecast.revenueMerchandise + forecast.revenueSponsorship;
    const totalForecastCost = forecast.costStaffing + forecast.costVenue + forecast.costVendors + forecast.costMarketing + forecast.costProduction + forecast.costOther;
    
    const totalActualRevenue = actual.actualRevenueTickets + actual.actualRevenueFnB + actual.actualRevenueMerchandise + actual.actualRevenueSponsorship;
    const totalActualCost = actual.actualCostStaffing + actual.actualCostVenue + actual.actualCostVendors + actual.actualCostMarketing + actual.actualCostProduction + actual.actualCostOther;

    const revenueVariance = totalActualRevenue - totalForecastRevenue;
    const costVariance = totalActualCost - totalForecastCost;
    const profitVariance = (totalActualRevenue - totalActualCost) - (totalForecastRevenue - totalForecastCost);

    return {
      revenueVariance,
      costVariance,
      profitVariance,
      revenueVariancePercent: totalForecastRevenue > 0 ? (revenueVariance / totalForecastRevenue) * 100 : 0,
      costVariancePercent: totalForecastCost > 0 ? (costVariance / totalForecastCost) * 100 : 0,
      profitVariancePercent: (totalForecastRevenue - totalForecastCost) > 0 ? (profitVariance / (totalForecastRevenue - totalForecastCost)) * 100 : 0
    };
  }
}
