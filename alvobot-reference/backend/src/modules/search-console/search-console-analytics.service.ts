import { Injectable, Logger } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import axios from "axios";
import {
  SearchAnalyticsReportDto,
  SearchAnalyticsExpandDto,
  SearchAnalyticsSourceDto,
  SearchConsolePrimaryGroupBy,
  SearchConsoleRow,
  SearchConsoleSummary,
  SearchConsoleReportResponse,
  SearchConsoleExpandResponse,
  SearchConsoleMetrics,
} from "./dto/search-analytics.dto";

interface GoogleSearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GoogleSearchAnalyticsResponse {
  rows?: GoogleSearchAnalyticsRow[];
  responseAggregationType?: string;
}

// Country code to name mapping
const COUNTRY_NAMES: Record<string, string> = {
  ABW: "Aruba",
  AFG: "Afeganistão",
  AGO: "Angola",
  AIA: "Anguilla",
  ALA: "Ilhas Åland",
  ALB: "Albânia",
  AND: "Andorra",
  ARE: "Emirados Árabes Unidos",
  ARG: "Argentina",
  ARM: "Armênia",
  ASM: "Samoa Americana",
  ATA: "Antártida",
  ATF: "Terras Austrais Francesas",
  ATG: "Antígua e Barbuda",
  AUS: "Austrália",
  AUT: "Áustria",
  AZE: "Azerbaijão",
  BDI: "Burundi",
  BEL: "Bélgica",
  BEN: "Benin",
  BES: "Bonaire",
  BFA: "Burkina Faso",
  BGD: "Bangladesh",
  BGR: "Bulgária",
  BHR: "Bahrein",
  BHS: "Bahamas",
  BIH: "Bósnia e Herzegovina",
  BLM: "São Bartolomeu",
  BLR: "Bielorrússia",
  BLZ: "Belize",
  BMU: "Bermudas",
  BOL: "Bolívia",
  BRA: "Brasil",
  BRB: "Barbados",
  BRN: "Brunei",
  BTN: "Butão",
  BVT: "Ilha Bouvet",
  BWA: "Botsuana",
  CAF: "República Centro-Africana",
  CAN: "Canadá",
  CCK: "Ilhas Cocos",
  CHE: "Suíça",
  CHL: "Chile",
  CHN: "China",
  CIV: "Costa do Marfim",
  CMR: "Camarões",
  COD: "RD Congo",
  COG: "Congo",
  COK: "Ilhas Cook",
  COL: "Colômbia",
  COM: "Comores",
  CPV: "Cabo Verde",
  CRI: "Costa Rica",
  CUB: "Cuba",
  CUW: "Curaçao",
  CXR: "Ilha Christmas",
  CYM: "Ilhas Cayman",
  CYP: "Chipre",
  CZE: "Tchéquia",
  DEU: "Alemanha",
  DJI: "Djibuti",
  DMA: "Dominica",
  DNK: "Dinamarca",
  DOM: "República Dominicana",
  DZA: "Argélia",
  ECU: "Equador",
  EGY: "Egito",
  ERI: "Eritreia",
  ESH: "Saara Ocidental",
  ESP: "Espanha",
  EST: "Estônia",
  ETH: "Etiópia",
  FIN: "Finlândia",
  FJI: "Fiji",
  FLK: "Ilhas Malvinas",
  FRA: "França",
  FRO: "Ilhas Faroé",
  FSM: "Micronésia",
  GAB: "Gabão",
  GBR: "Reino Unido",
  GEO: "Geórgia",
  GGY: "Guernsey",
  GHA: "Gana",
  GIB: "Gibraltar",
  GIN: "Guiné",
  GLP: "Guadalupe",
  GMB: "Gâmbia",
  GNB: "Guiné-Bissau",
  GNQ: "Guiné Equatorial",
  GRC: "Grécia",
  GRD: "Granada",
  GRL: "Groenlândia",
  GTM: "Guatemala",
  GUF: "Guiana Francesa",
  GUM: "Guam",
  GUY: "Guiana",
  HKG: "Hong Kong",
  HMD: "Ilha Heard",
  HND: "Honduras",
  HRV: "Croácia",
  HTI: "Haiti",
  HUN: "Hungria",
  IDN: "Indonésia",
  IMN: "Ilha de Man",
  IND: "Índia",
  IOT: "Território Britânico do Oceano Índico",
  IRL: "Irlanda",
  IRN: "Irã",
  IRQ: "Iraque",
  ISL: "Islândia",
  ISR: "Israel",
  ITA: "Itália",
  JAM: "Jamaica",
  JEY: "Jersey",
  JOR: "Jordânia",
  JPN: "Japão",
  KAZ: "Cazaquistão",
  KEN: "Quênia",
  KGZ: "Quirguistão",
  KHM: "Camboja",
  KIR: "Kiribati",
  KNA: "São Cristóvão e Nevis",
  KOR: "Coreia do Sul",
  KWT: "Kuwait",
  LAO: "Laos",
  LBN: "Líbano",
  LBR: "Libéria",
  LBY: "Líbia",
  LCA: "Santa Lúcia",
  LIE: "Liechtenstein",
  LKA: "Sri Lanka",
  LSO: "Lesoto",
  LTU: "Lituânia",
  LUX: "Luxemburgo",
  LVA: "Letônia",
  MAC: "Macau",
  MAF: "São Martinho",
  MAR: "Marrocos",
  MCO: "Mônaco",
  MDA: "Moldávia",
  MDG: "Madagascar",
  MDV: "Maldivas",
  MEX: "México",
  MHL: "Ilhas Marshall",
  MKD: "Macedônia do Norte",
  MLI: "Mali",
  MLT: "Malta",
  MMR: "Mianmar",
  MNE: "Montenegro",
  MNG: "Mongólia",
  MNP: "Ilhas Marianas do Norte",
  MOZ: "Moçambique",
  MRT: "Mauritânia",
  MSR: "Montserrat",
  MTQ: "Martinica",
  MUS: "Maurício",
  MWI: "Malawi",
  MYS: "Malásia",
  MYT: "Mayotte",
  NAM: "Namíbia",
  NCL: "Nova Caledônia",
  NER: "Níger",
  NFK: "Ilha Norfolk",
  NGA: "Nigéria",
  NIC: "Nicarágua",
  NIU: "Niue",
  NLD: "Países Baixos",
  NOR: "Noruega",
  NPL: "Nepal",
  NRU: "Nauru",
  NZL: "Nova Zelândia",
  OMN: "Omã",
  PAK: "Paquistão",
  PAN: "Panamá",
  PCN: "Ilhas Pitcairn",
  PER: "Peru",
  PHL: "Filipinas",
  PLW: "Palau",
  PNG: "Papua Nova Guiné",
  POL: "Polônia",
  PRI: "Porto Rico",
  PRK: "Coreia do Norte",
  PRT: "Portugal",
  PRY: "Paraguai",
  PSE: "Palestina",
  PYF: "Polinésia Francesa",
  QAT: "Catar",
  REU: "Reunião",
  ROU: "Romênia",
  RUS: "Rússia",
  RWA: "Ruanda",
  SAU: "Arábia Saudita",
  SDN: "Sudão",
  SEN: "Senegal",
  SGP: "Singapura",
  SGS: "Ilhas Geórgia do Sul",
  SHN: "Santa Helena",
  SJM: "Svalbard",
  SLB: "Ilhas Salomão",
  SLE: "Serra Leoa",
  SLV: "El Salvador",
  SMR: "San Marino",
  SOM: "Somália",
  SPM: "São Pedro e Miquelão",
  SRB: "Sérvia",
  SSD: "Sudão do Sul",
  STP: "São Tomé e Príncipe",
  SUR: "Suriname",
  SVK: "Eslováquia",
  SVN: "Eslovênia",
  SWE: "Suécia",
  SWZ: "Eswatini",
  SXM: "Sint Maarten",
  SYC: "Seychelles",
  SYR: "Síria",
  TCA: "Ilhas Turcas e Caicos",
  TCD: "Chade",
  TGO: "Togo",
  THA: "Tailândia",
  TJK: "Tajiquistão",
  TKL: "Tokelau",
  TKM: "Turcomenistão",
  TLS: "Timor-Leste",
  TON: "Tonga",
  TTO: "Trinidad e Tobago",
  TUN: "Tunísia",
  TUR: "Turquia",
  TUV: "Tuvalu",
  TWN: "Taiwan",
  TZA: "Tanzânia",
  UGA: "Uganda",
  UKR: "Ucrânia",
  UMI: "Ilhas Menores Distantes dos EUA",
  URY: "Uruguai",
  USA: "Estados Unidos",
  UZB: "Uzbequistão",
  VAT: "Vaticano",
  VCT: "São Vicente e Granadinas",
  VEN: "Venezuela",
  VGB: "Ilhas Virgens Britânicas",
  VIR: "Ilhas Virgens Americanas",
  VNM: "Vietnã",
  VUT: "Vanuatu",
  WLF: "Wallis e Futuna",
  WSM: "Samoa",
  YEM: "Iêmen",
  ZAF: "África do Sul",
  ZMB: "Zâmbia",
  ZWE: "Zimbábue",
};

// Device display names
const DEVICE_NAMES: Record<string, string> = {
  DESKTOP: "Desktop",
  MOBILE: "Mobile",
  TABLET: "Tablet",
};

@Injectable()
export class SearchConsoleAnalyticsService {
  private readonly logger = new Logger(SearchConsoleAnalyticsService.name);
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
    );
  }

  /**
   * Get analytics report from Search Console
   */
  async getReport(
    dto: SearchAnalyticsReportDto,
    userId: string,
  ): Promise<SearchConsoleReportResponse> {
    this.logger.log(
      `Fetching Search Console report for ${dto.sources.length} sources`,
    );

    const failedSources: Array<{ siteUrl: string; error: string }> = [];
    const allRows: SearchConsoleRow[] = [];

    // Fetch data from all sources in parallel
    const results = await Promise.allSettled(
      dto.sources.map((source) => this.fetchSourceData(source, dto, userId)),
    );

    // Process results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const source = dto.sources[i];

      if (result.status === "fulfilled") {
        allRows.push(...result.value);
      } else {
        this.logger.error(
          `Failed to fetch data for ${source.siteUrl}: ${result.reason}`,
        );
        failedSources.push({
          siteUrl: source.siteUrl,
          error: result.reason?.message || "Unknown error",
        });
      }
    }

    // Aggregate rows by key (for multiple sources with same key)
    const aggregatedRows = this.aggregateRows(allRows, dto.groupBy);

    // Apply search filter
    let filteredRows = aggregatedRows;
    if (dto.search) {
      const searchLower = dto.search.toLowerCase();
      filteredRows = aggregatedRows.filter(
        (row) =>
          row.key.toLowerCase().includes(searchLower) ||
          (row.displayName &&
            row.displayName.toLowerCase().includes(searchLower)),
      );
    }

    // Sort rows
    const sortBy = dto.sortBy || "clicks";
    const sortOrder = dto.sortOrder || "desc";
    filteredRows.sort((a, b) => {
      const aVal = a[sortBy as keyof SearchConsoleMetrics] || 0;
      const bVal = b[sortBy as keyof SearchConsoleMetrics] || 0;
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });

    // Calculate summary from all rows (before pagination)
    const summary = this.calculateSummary(filteredRows);

    // Paginate
    const page = dto.page || 1;
    const limit = dto.limit || 50;
    const startIndex = (page - 1) * limit;
    const paginatedRows = filteredRows.slice(startIndex, startIndex + limit);

    return {
      rows: paginatedRows,
      summary,
      pagination: {
        page,
        limit,
        total: filteredRows.length,
        totalPages: Math.ceil(filteredRows.length / limit),
      },
      cachedAt: new Date().toISOString(),
      failedSources: failedSources.length > 0 ? failedSources : undefined,
    };
  }

  /**
   * Expand a row to show sub-grouping
   */
  async expand(
    dto: SearchAnalyticsExpandDto,
    userId: string,
  ): Promise<SearchConsoleExpandResponse> {
    this.logger.log(
      `Expanding ${dto.parentKey} with sub-grouping ${dto.subGroupBy}`,
    );

    const allItems: SearchConsoleRow[] = [];

    // Fetch expanded data from all sources
    const results = await Promise.allSettled(
      dto.sources.map((source) => this.fetchExpandedData(source, dto, userId)),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }

    // Aggregate by key
    const aggregated = this.aggregateRows(
      allItems,
      dto.subGroupBy as SearchConsolePrimaryGroupBy,
    );

    // Sort by clicks descending
    aggregated.sort((a, b) => b.clicks - a.clicks);

    return {
      items: aggregated,
      parentKey: dto.parentKey,
    };
  }

  /**
   * Fetch data from a single source
   */
  private async fetchSourceData(
    source: SearchAnalyticsSourceDto,
    dto: SearchAnalyticsReportDto,
    userId: string,
  ): Promise<SearchConsoleRow[]> {
    const connection = await this.getConnectionWithValidToken(
      source.connectionId,
      userId,
    );

    // Map groupBy to Google API dimension
    const dimension = this.mapGroupByToDimension(dto.groupBy);

    // Build request body
    const requestBody: Record<string, unknown> = {
      startDate: dto.startDate,
      endDate: dto.endDate,
      dimensions: [dimension],
      rowLimit: 25000,
      startRow: 0,
    };

    // Add search type filter
    if (dto.searchType) {
      requestBody.type = dto.searchType;
    }

    // Add dimension filters
    const filters = this.buildDimensionFilters(dto);
    if (filters.length > 0) {
      requestBody.dimensionFilterGroups = [
        {
          filters,
        },
      ];
    }

    // Call Google Search Analytics API
    const response = await axios.post<GoogleSearchAnalyticsResponse>(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(source.siteUrl)}/searchAnalytics/query`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    // Transform response to our format
    return (response.data.rows || []).map((row) =>
      this.transformRow(row, source, dto.groupBy),
    );
  }

  /**
   * Fetch expanded data for a parent key
   */
  private async fetchExpandedData(
    source: SearchAnalyticsSourceDto,
    dto: SearchAnalyticsExpandDto,
    userId: string,
  ): Promise<SearchConsoleRow[]> {
    const connection = await this.getConnectionWithValidToken(
      source.connectionId,
      userId,
    );

    const primaryDimension = this.mapGroupByToDimension(
      dto.primaryGroupBy as SearchConsolePrimaryGroupBy,
    );
    const subDimension = this.mapGroupByToDimension(
      dto.subGroupBy as SearchConsolePrimaryGroupBy,
    );

    // Build request with both dimensions and filter by parent
    const requestBody: Record<string, unknown> = {
      startDate: dto.startDate,
      endDate: dto.endDate,
      dimensions: [primaryDimension, subDimension],
      rowLimit: 25000,
      startRow: 0,
      dimensionFilterGroups: [
        {
          filters: [
            {
              dimension: primaryDimension,
              operator: "equals",
              expression: dto.parentKey,
            },
          ],
        },
      ],
    };

    if (dto.searchType) {
      requestBody.type = dto.searchType;
    }

    // Add device filter if specified
    if (dto.device) {
      (
        requestBody.dimensionFilterGroups as Array<{ filters: unknown[] }>
      )[0].filters.push({
        dimension: "device",
        operator: "equals",
        expression: dto.device,
      });
    }

    const response = await axios.post<GoogleSearchAnalyticsResponse>(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(source.siteUrl)}/searchAnalytics/query`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      },
    );

    // Transform - use second key (subGroupBy dimension) as the row key
    return (response.data.rows || []).map((row) => ({
      key: row.keys[1], // Second dimension is the sub-group
      displayName: this.getDisplayName(
        row.keys[1],
        dto.subGroupBy as SearchConsolePrimaryGroupBy,
      ),
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      siteUrl: source.siteUrl,
      connectionId: source.connectionId,
      sources: [{ connectionId: source.connectionId, siteUrl: source.siteUrl }],
    }));
  }

  /**
   * Get connection with valid token, refreshing if needed
   */
  private async getConnectionWithValidToken(
    connectionId: string,
    userId: string,
  ) {
    const { data: connection, error } = await this.supabase
      .from("connections")
      .select("*")
      .eq("id", connectionId)
      .single();

    if (error || !connection) {
      throw new Error("Connection not found");
    }

    // Verify ownership: direct owner or workspace member
    if (connection.user_id !== userId) {
      if (connection.workspace_id) {
        const { data: membership } = await this.supabase
          .from("workspace_members")
          .select("id")
          .eq("workspace_id", connection.workspace_id)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (!membership) {
          throw new Error("Você não tem acesso a esta conexão");
        }
      } else {
        throw new Error("Você não tem acesso a esta conexão");
      }
    }

    // Check if token is expired
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt <= fiveMinutesFromNow) {
      // Refresh the token
      return await this.refreshToken(connection);
    }

    return connection;
  }

  /**
   * Refresh access token
   */
  private async refreshToken(connection: Record<string, unknown>) {
    const response = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    });

    const { access_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    // Update connection in database
    await this.supabase
      .from("connections")
      .update({
        access_token,
        token_expires_at: expiresAt.toISOString(),
      })
      .eq("id", connection.id);

    return {
      ...connection,
      access_token,
      token_expires_at: expiresAt.toISOString(),
    };
  }

  /**
   * Map groupBy to Google API dimension
   */
  private mapGroupByToDimension(groupBy: SearchConsolePrimaryGroupBy): string {
    switch (groupBy) {
      case SearchConsolePrimaryGroupBy.QUERY:
        return "query";
      case SearchConsolePrimaryGroupBy.PAGE:
        return "page";
      case SearchConsolePrimaryGroupBy.COUNTRY:
        return "country";
      case SearchConsolePrimaryGroupBy.DEVICE:
        return "device";
      case SearchConsolePrimaryGroupBy.DATE_DAY:
      case SearchConsolePrimaryGroupBy.DATE_WEEK:
      case SearchConsolePrimaryGroupBy.DATE_MONTH:
        return "date";
      case SearchConsolePrimaryGroupBy.SEARCH_APPEARANCE:
        return "searchAppearance";
      default:
        return "query";
    }
  }

  /**
   * Build dimension filters for Google API
   */
  private buildDimensionFilters(
    dto: SearchAnalyticsReportDto,
  ): Array<{ dimension: string; operator: string; expression: string }> {
    const filters: Array<{
      dimension: string;
      operator: string;
      expression: string;
    }> = [];

    if (dto.device) {
      filters.push({
        dimension: "device",
        operator: "equals",
        expression: dto.device,
      });
    }

    if (dto.country) {
      filters.push({
        dimension: "country",
        operator: "equals",
        expression: dto.country,
      });
    }

    return filters;
  }

  /**
   * Transform Google API row to our format
   */
  private transformRow(
    row: GoogleSearchAnalyticsRow,
    source: SearchAnalyticsSourceDto,
    groupBy: SearchConsolePrimaryGroupBy,
  ): SearchConsoleRow {
    const key = row.keys[0];

    return {
      key,
      displayName: this.getDisplayName(key, groupBy),
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      siteUrl: source.siteUrl,
      connectionId: source.connectionId,
      sources: [{ connectionId: source.connectionId, siteUrl: source.siteUrl }],
    };
  }

  /**
   * Get display name for a key based on groupBy
   */
  private getDisplayName(
    key: string,
    groupBy: SearchConsolePrimaryGroupBy,
  ): string | undefined {
    switch (groupBy) {
      case SearchConsolePrimaryGroupBy.COUNTRY:
        return COUNTRY_NAMES[key] || key;
      case SearchConsolePrimaryGroupBy.DEVICE:
        return DEVICE_NAMES[key] || key;
      default:
        return undefined;
    }
  }

  /**
   * Aggregate rows with same key from multiple sources
   */
  private aggregateRows(
    rows: SearchConsoleRow[],
    groupBy: SearchConsolePrimaryGroupBy,
  ): SearchConsoleRow[] {
    const map = new Map<string, SearchConsoleRow>();

    for (const row of rows) {
      // For date groupings, we might need to transform the key
      let key = row.key;
      if (groupBy === SearchConsolePrimaryGroupBy.DATE_WEEK) {
        key = this.getWeekKey(row.key);
      } else if (groupBy === SearchConsolePrimaryGroupBy.DATE_MONTH) {
        key = this.getMonthKey(row.key);
      }

      const existing = map.get(key);
      if (existing) {
        // Aggregate metrics (weighted average for position and CTR)
        const totalImpressions = existing.impressions + row.impressions;
        existing.clicks += row.clicks;
        existing.impressions = totalImpressions;
        existing.ctr =
          totalImpressions > 0 ? existing.clicks / totalImpressions : 0;
        existing.position =
          totalImpressions > 0
            ? (existing.position * existing.impressions +
                row.position * row.impressions) /
              totalImpressions
            : row.position;

        // Merge sources
        if (existing.sources && row.sources) {
          existing.sources.push(...row.sources);
        }
      } else {
        map.set(key, { ...row, key });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Get week key from date (YYYY-Www format)
   */
  private getWeekKey(dateStr: string): string {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, "0")}`;
  }

  /**
   * Get month key from date (YYYY-MM format)
   */
  private getMonthKey(dateStr: string): string {
    return dateStr.substring(0, 7); // YYYY-MM
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Calculate summary from rows
   */
  private calculateSummary(rows: SearchConsoleRow[]): SearchConsoleSummary {
    const summary: SearchConsoleSummary = {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      totalRows: rows.length,
    };

    if (rows.length === 0) {
      return summary;
    }

    let totalWeightedPosition = 0;

    for (const row of rows) {
      summary.clicks += row.clicks;
      summary.impressions += row.impressions;
      totalWeightedPosition += row.position * row.impressions;
    }

    // Calculate CTR and weighted average position
    summary.ctr =
      summary.impressions > 0 ? summary.clicks / summary.impressions : 0;
    summary.position =
      summary.impressions > 0 ? totalWeightedPosition / summary.impressions : 0;

    return summary;
  }
}
