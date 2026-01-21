/**
 * Comprehensive PDF Export Utility
 * Generates a complete location analysis report including:
 * - WMS Maps with legends, descriptions, and scores
 * - Target group scenarios with rankings and calculations
 * - Data tables from all tabs (Demographics, Health, Safety, Livability, etc.)
 * - Score overview charts
 */

import jsPDF from 'jspdf';
import type { UnifiedLocationData, UnifiedDataRow } from '../data/aggregator/multiLevelAggregator';
import type { PersonaScore } from '../utils/targetGroupScoring';
import type { WMSGradingData, WMSLayerGrading } from '../types/wms-grading';
import type { AmenityMultiCategoryResponse, AmenitySearchResult } from '../data/sources/google-places/types';
import { WMS_CATEGORIES, type WMSLayerConfig } from '../components/Maps/wmsLayers';
import { getLayerConfig, getCriticalLayers } from '../data/sources/wmsGradingConfig';
import { downloadWMSTile, downloadWMSLegend, type MapCapture, type LegendCapture } from './mapExport';
import { captureAllScenarioCubes, type CubeCaptureResult } from './cubeCapture';
import { getPersonaCubePosition } from './cubePositionMapping';
import { calculateAllAmenityScores, type AmenityScore } from '../data/scoring/amenityScoring';
import { getOmgevingChartData } from './calculateOmgevingScores';

// Types for the PDF export
export interface ComprehensivePdfOptions {
  locale: 'nl' | 'en';
  title?: string;
  filename?: string;
  includeWMSMaps?: boolean;
  includeTargetGroups?: boolean;
  includeDataTables?: boolean;
  includeScoreOverview?: boolean;
}

export interface ComprehensivePdfData {
  locationData: UnifiedLocationData;
  coordinates: [number, number];
  address: string;
  personaScores: PersonaScore[];
  scenarios: {
    scenario1: number[];
    scenario2: number[];
    scenario3: number[];
    customScenario?: number[];
  };
  /** Cube colors for each position (0-26) */
  cubeColors?: string[];
  personas: Array<{
    id: string;
    name: string;
    income_level: string;
    household_type: string;
    age_group: string;
    description: string;
    current_situation?: string;
    desired_situation?: string;
    current_property_types?: string[];
    desired_property_types?: string[];
    imageDataUrl?: string;
  }>;
  /** Pre-fetched persona images mapped by persona ID */
  personaImages?: Record<string, string>;
  wmsGradingData?: WMSGradingData | null;
  amenitiesData?: AmenityMultiCategoryResponse | null;
  /** PVE configuration */
  pveData?: {
    presetId?: string;
    totalM2?: number;
    percentages?: {
      apartments: number;
      commercial: number;
      hospitality: number;
      social: number;
      communal: number;
      offices: number;
    };
  } | null;
  /** LLM-generated introduction text */
  introductionText?: string;
}

// Translations
const translations = {
  nl: {
    title: 'Locatie Analyse Rapport',
    generatedOn: 'Gegenereerd op',
    address: 'Adres',
    coordinates: 'Coördinaten',
    tableOfContents: 'Inhoudsopgave',
    section: 'Sectie',
    page: 'Pagina',
    wmsMapSection: 'Kaartlagen Analyse',
    targetGroupSection: 'Doelgroepen Analyse',
    scoreOverview: 'Score Overzicht',
    dataTablesSection: 'Data Tabellen',
    demographics: 'Demografie',
    health: 'Gezondheid',
    safety: 'Veiligheid',
    livability: 'Leefbaarheid',
    residential: 'Woningmarkt',
    amenities: 'Voorzieningen',
    scenario: 'Scenario',
    rank: 'Rang',
    persona: 'Doelgroep',
    totalScore: 'Totaal Score',
    matchScore: 'Match Score',
    legend: 'Legenda',
    description: 'Beschrijving',
    pointValue: 'Puntwaarde',
    avgValue: 'Gemiddelde waarde',
    maxValue: 'Maximum waarde',
    unit: 'Eenheid',
    noData: 'Geen data',
    neighborhood: 'Buurt',
    district: 'Wijk',
    municipality: 'Gemeente',
    national: 'Nationaal',
    value: 'Waarde',
    indicator: 'Indicator',
    targetGroupRankings: 'Doelgroep Rangschikking',
    targetGroupCalculations: 'Doelgroep Berekeningen',
    scenarioComparison: 'Scenario Vergelijking',
    topPersonas: 'Top Doelgroepen',
    categoryScores: 'Categorie Scores',
    notes: 'Notities',
    mapLayersAnalyzed: 'Geanalyseerde Kaartlagen',
    criticalLayers: 'Kritieke Lagen',
    airQuality: 'Luchtkwaliteit',
    noise: 'Geluid',
    nature: 'Groen',
    climate: 'Klimaat',
    amenitiesNearby: 'Voorzieningen in de Buurt',
    distance: 'Afstand',
    count: 'Aantal',
    category: 'Categorie',
    scenarioCubes: 'Doelgroep Scenario Visualisaties',
    scenario1Title: 'Scenario 1: Starters & Jonge Gezinnen',
    scenario1Desc: 'Focus op betaalbare woningen voor starters en jonge gezinnen met lage tot middeninkomens.',
    scenario2Title: 'Scenario 2: Doorstromers',
    scenario2Desc: 'Focus op gezinnen en alleenstaanden met middeninkomens die willen doorstromen naar een grotere woning.',
    scenario3Title: 'Scenario 3: Senioren & Vermogenden',
    scenario3Desc: 'Focus op oudere huishoudens en huishoudens met hogere inkomens of vermogen.',
    customScenarioTitle: 'Aangepast Scenario',
    customScenarioDesc: 'Door gebruiker geselecteerde doelgroepen.',
    cubeVisualization: 'Kubus Visualisatie',
    cubeExplanation: 'De 3x3x3 kubus toont de doelgroepen gepositioneerd op basis van inkomen (X-as), leeftijd (Y-as) en huishoudtype (Z-as). Gekleurde kubussen vertegenwoordigen de geselecteerde doelgroepen voor dit scenario.',
    // Introduction section
    introduction: 'Introductie',
    // PVE section
    pveSection: 'Programma van Eisen',
    pveAllocations: 'Ruimteverdeling',
    totalArea: 'Totaal oppervlak',
    apartments: 'Appartementen',
    commercial: 'Commercieel',
    hospitality: 'Horeca',
    social: 'Sociaal',
    communal: 'Gemeenschappelijk',
    offices: 'Kantoren',
    // Persona card fields
    income: 'Inkomen',
    age: 'Leeftijd',
    household: 'Huishouden',
    currentSituation: 'Huidige Situatie',
    desiredSituation: 'Gewenste Situatie',
    currentHousing: 'Huidig Woningtype',
    desiredHousing: 'Gewenst Woningtype',
    // Complete ranking table
    completeRankingTitle: 'Totale Score Tabel',
    completeRankingSubtitle: 'Ranking van doelgroepen op basis van R-rank en Z-rank',
    rRankPosition: 'R-Rank Positie',
    zRankPosition: 'Z-Rank Positie',
    rRankScore: 'R-Rank Score',
    zRankScore: 'Z-Rank Score',
    weightedTotal: 'Gewogen Totaal',
    // Detailed scoring table
    detailedScoringTitle: 'Gedetailleerde Score Tabel',
    detailedScoringSubtitle: 'Scores per categorie voor elke doelgroep',
    subcategory: 'Subcategorie',
    // Omgeving section
    omgevingSection: 'Omgevingsdata',
    // AI Building Program section
    aiBuildingProgram: 'AI Bouwprogramma',
    aiBuildingProgramPlaceholder: 'Dit gedeelte wordt ingevuld na generatie van het AI Bouwprogramma rapport.',
  },
  en: {
    title: 'Location Analysis Report',
    generatedOn: 'Generated on',
    address: 'Address',
    coordinates: 'Coordinates',
    tableOfContents: 'Table of Contents',
    section: 'Section',
    page: 'Page',
    wmsMapSection: 'Map Layers Analysis',
    targetGroupSection: 'Target Groups Analysis',
    scoreOverview: 'Score Overview',
    dataTablesSection: 'Data Tables',
    demographics: 'Demographics',
    health: 'Health',
    safety: 'Safety',
    livability: 'Livability',
    residential: 'Housing Market',
    amenities: 'Amenities',
    scenario: 'Scenario',
    rank: 'Rank',
    persona: 'Target Group',
    totalScore: 'Total Score',
    matchScore: 'Match Score',
    legend: 'Legend',
    description: 'Description',
    pointValue: 'Point Value',
    avgValue: 'Average Value',
    maxValue: 'Maximum Value',
    unit: 'Unit',
    noData: 'No Data',
    neighborhood: 'Neighborhood',
    district: 'District',
    municipality: 'Municipality',
    national: 'National',
    value: 'Value',
    indicator: 'Indicator',
    targetGroupRankings: 'Target Group Rankings',
    targetGroupCalculations: 'Target Group Calculations',
    scenarioComparison: 'Scenario Comparison',
    topPersonas: 'Top Target Groups',
    categoryScores: 'Category Scores',
    notes: 'Notes',
    mapLayersAnalyzed: 'Analyzed Map Layers',
    criticalLayers: 'Critical Layers',
    airQuality: 'Air Quality',
    noise: 'Noise',
    nature: 'Green Space',
    climate: 'Climate',
    amenitiesNearby: 'Nearby Amenities',
    distance: 'Distance',
    count: 'Count',
    category: 'Category',
    scenarioCubes: 'Target Group Scenario Visualizations',
    scenario1Title: 'Scenario 1: Starters & Young Families',
    scenario1Desc: 'Focus on affordable housing for starters and young families with low to middle incomes.',
    scenario2Title: 'Scenario 2: Move-up Buyers',
    scenario2Desc: 'Focus on families and singles with middle incomes looking to move up to a larger home.',
    scenario3Title: 'Scenario 3: Seniors & Affluent',
    scenario3Desc: 'Focus on older households and households with higher incomes or wealth.',
    customScenarioTitle: 'Custom Scenario',
    customScenarioDesc: 'User-selected target groups.',
    cubeVisualization: 'Cube Visualization',
    cubeExplanation: 'The 3x3x3 cube shows target groups positioned by income (X-axis), age (Y-axis), and household type (Z-axis). Colored cubes represent the selected target groups for this scenario.',
    // Introduction section
    introduction: 'Introduction',
    // PVE section
    pveSection: 'Program of Requirements',
    pveAllocations: 'Space Allocation',
    totalArea: 'Total area',
    apartments: 'Apartments',
    commercial: 'Commercial',
    hospitality: 'Hospitality',
    social: 'Social',
    communal: 'Communal',
    offices: 'Offices',
    // Persona card fields
    income: 'Income',
    age: 'Age',
    household: 'Household',
    currentSituation: 'Current Situation',
    desiredSituation: 'Desired Situation',
    currentHousing: 'Current Housing',
    desiredHousing: 'Desired Housing',
    // Complete ranking table
    completeRankingTitle: 'Total Scoring Table',
    completeRankingSubtitle: 'Ranking of target groups based on R-rank and Z-rank',
    rRankPosition: 'R-Rank Position',
    zRankPosition: 'Z-Rank Position',
    rRankScore: 'R-Rank Score',
    zRankScore: 'Z-Rank Score',
    weightedTotal: 'Weighted Total',
    // Detailed scoring table
    detailedScoringTitle: 'Detailed Scoring Table',
    detailedScoringSubtitle: 'Scores per category for each target group',
    subcategory: 'Subcategory',
    // Omgeving section
    omgevingSection: 'Environment Data',
    // AI Building Program section
    aiBuildingProgram: 'AI Building Program',
    aiBuildingProgramPlaceholder: 'This section will be filled after generating the AI Building Program report.',
  }
};

// A4 dimensions and layout constants
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const HEADER_HEIGHT = 15;
const FOOTER_HEIGHT = 10;

// Netherlands bounding box (approximate)
const NL_BOUNDS = {
  minLat: 50.75,
  maxLat: 53.55,
  minLng: 3.35,
  maxLng: 7.25,
};

/**
 * Check if coordinates are valid for Netherlands WMS services
 */
export function isValidNetherlandsCoordinate(lat: number, lng: number): boolean {
  // Check for [0, 0] or invalid coordinates
  if (lat === 0 && lng === 0) return false;
  if (isNaN(lat) || isNaN(lng)) return false;

  // Check if within Netherlands bounds
  return (
    lat >= NL_BOUNDS.minLat &&
    lat <= NL_BOUNDS.maxLat &&
    lng >= NL_BOUNDS.minLng &&
    lng <= NL_BOUNDS.maxLng
  );
}

/**
 * Helper class for building PDF pages with consistent layout
 */
class PdfBuilder {
  private pdf: jsPDF;
  private t: typeof translations.nl;
  private currentPage = 1;
  private currentY = MARGIN + HEADER_HEIGHT;
  private sections: { title: string; page: number }[] = [];
  private locale: 'nl' | 'en';

  constructor(locale: 'nl' | 'en') {
    this.locale = locale;
    this.t = translations[locale];
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.pdf.setFont('helvetica');
  }

  /**
   * Add title page
   */
  addTitlePage(title: string, address: string, coordinates: [number, number]): void {
    // Title
    this.pdf.setFontSize(28);
    this.pdf.setTextColor(71, 118, 56); // Primary color
    this.pdf.text(title, PAGE_WIDTH / 2, 60, { align: 'center' });

    // Subtitle line
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(100, 100, 100);
    const dateStr = new Date().toLocaleDateString(this.locale === 'nl' ? 'nl-NL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    this.pdf.text(`${this.t.generatedOn}: ${dateStr}`, PAGE_WIDTH / 2, 75, { align: 'center' });

    // Address box
    this.pdf.setFillColor(248, 248, 248);
    this.pdf.roundedRect(MARGIN, 100, CONTENT_WIDTH, 40, 3, 3, 'F');

    this.pdf.setFontSize(12);
    this.pdf.setTextColor(50, 50, 50);
    this.pdf.text(`${this.t.address}:`, MARGIN + 10, 115);
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(0, 0, 0);
    this.pdf.text(address, MARGIN + 10, 125);

    this.pdf.setFontSize(10);
    this.pdf.setTextColor(100, 100, 100);
    this.pdf.text(
      `${this.t.coordinates}: ${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`,
      MARGIN + 10,
      135
    );

    this.addNewPage();
  }

  /**
   * Add table of contents (placeholder - will be filled after all sections)
   */
  addTableOfContents(): number {
    const tocPage = this.currentPage;
    this.addSectionTitle(this.t.tableOfContents);
    this.addNewPage();
    return tocPage;
  }

  /**
   * Update table of contents with actual page numbers
   */
  updateTableOfContents(tocPage: number): void {
    this.pdf.setPage(tocPage);
    let y = MARGIN + HEADER_HEIGHT + 20;

    this.pdf.setFontSize(11);
    this.pdf.setTextColor(50, 50, 50);

    this.sections.forEach((section, index) => {
      const sectionNum = `${index + 1}. `;
      const dotsWidth = CONTENT_WIDTH - 30;
      const pageNumStr = section.page.toString();

      this.pdf.text(sectionNum + section.title, MARGIN, y);
      this.pdf.text(pageNumStr, PAGE_WIDTH - MARGIN, y, { align: 'right' });
      y += 8;
    });
  }

  /**
   * Add a new section
   */
  startSection(title: string): void {
    if (this.currentY > MARGIN + HEADER_HEIGHT + 20) {
      this.addNewPage();
    }
    this.sections.push({ title, page: this.currentPage });
    this.addSectionTitle(title);
  }

  /**
   * Add section title
   */
  private addSectionTitle(title: string): void {
    this.pdf.setFontSize(18);
    this.pdf.setTextColor(71, 118, 56);
    this.pdf.text(title, MARGIN, this.currentY);
    this.currentY += 12;

    // Underline
    this.pdf.setDrawColor(71, 118, 56);
    this.pdf.setLineWidth(0.5);
    this.pdf.line(MARGIN, this.currentY - 5, PAGE_WIDTH - MARGIN, this.currentY - 5);
    this.currentY += 5;
  }

  /**
   * Add subsection title
   */
  addSubsectionTitle(title: string): void {
    this.checkPageBreak(15);
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(50, 50, 50);
    this.pdf.text(title, MARGIN, this.currentY);
    this.currentY += 10;
  }

  /**
   * Add paragraph text
   */
  addParagraph(text: string, indent = 0): void {
    this.checkPageBreak(10);
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(60, 60, 60);
    const lines = this.pdf.splitTextToSize(text, CONTENT_WIDTH - indent);
    this.pdf.text(lines, MARGIN + indent, this.currentY);
    this.currentY += lines.length * 5 + 3;
  }

  /**
   * Add a simple data table
   */
  addTable(headers: string[], rows: string[][], options?: {
    headerBg?: string;
    stripedRows?: boolean;
    columnWidths?: number[];
  }): void {
    const { headerBg = '#477638', stripedRows = true, columnWidths } = options || {};
    const colWidths = columnWidths || headers.map(() => CONTENT_WIDTH / headers.length);
    const rowHeight = 7;

    this.checkPageBreak(rowHeight * 3);

    // Header
    let x = MARGIN;
    this.pdf.setFillColor(71, 118, 56);
    this.pdf.rect(MARGIN, this.currentY - 4, CONTENT_WIDTH, rowHeight, 'F');

    this.pdf.setFontSize(9);
    this.pdf.setTextColor(255, 255, 255);
    headers.forEach((header, i) => {
      this.pdf.text(header, x + 2, this.currentY);
      x += colWidths[i];
    });
    this.currentY += rowHeight;

    // Rows
    this.pdf.setTextColor(50, 50, 50);
    rows.forEach((row, rowIndex) => {
      this.checkPageBreak(rowHeight);

      if (stripedRows && rowIndex % 2 === 1) {
        this.pdf.setFillColor(248, 248, 248);
        this.pdf.rect(MARGIN, this.currentY - 4, CONTENT_WIDTH, rowHeight, 'F');
      }

      x = MARGIN;
      row.forEach((cell, i) => {
        const truncated = cell.length > 30 ? cell.substring(0, 27) + '...' : cell;
        this.pdf.text(truncated, x + 2, this.currentY);
        x += colWidths[i];
      });
      this.currentY += rowHeight;
    });

    this.currentY += 5;
  }

  /**
   * Add a WMS map with description, legend, and score
   * Layout: 1cm margins, map+legend at top (80/20 ratio), title/description below with score markers
   */
  async addWMSMap(
    capture: MapCapture,
    aerialPhoto: MapCapture | null,
    layerConfig: WMSLayerConfig,
    gradingResult?: WMSLayerGrading,
    legend?: LegendCapture | null
  ): Promise<void> {
    // Always start a new page for each WMS map
    this.addNewPage();

    // Layout constants for WMS maps (1cm = 10mm margin from page edge)
    const WMS_MARGIN = 10;
    const WMS_CONTENT_WIDTH = PAGE_WIDTH - 2 * WMS_MARGIN; // 190mm

    // 80/20 ratio: map takes 80% of width, legend takes 20%
    const MAP_SIZE = Math.floor(WMS_CONTENT_WIDTH * 0.8); // 152mm square
    const LEGEND_WIDTH = WMS_CONTENT_WIDTH - MAP_SIZE; // 38mm
    const TEXT_INDENT = 40; // 4cm indent for title/description (leaves space for score markers)

    const hasLegend = legend && legend.dataUrl;
    const mapX = WMS_MARGIN;
    const mapY = MARGIN + HEADER_HEIGHT;
    const legendX = WMS_MARGIN + MAP_SIZE; // No gap, legend directly adjacent to map

    try {
      // Add aerial photo background if available (at 50% opacity)
      if (aerialPhoto) {
        // Create graphics state for 50% opacity
        const gState = this.pdf.GState({ opacity: 0.5 });
        this.pdf.setGState(gState);

        this.pdf.addImage(
          aerialPhoto.dataUrl,
          'PNG',
          mapX,
          mapY,
          MAP_SIZE,
          MAP_SIZE,
          undefined,
          'FAST'
        );

        // Reset to full opacity for WMS layer
        const fullOpacity = this.pdf.GState({ opacity: 1.0 });
        this.pdf.setGState(fullOpacity);
      }

      // Add WMS layer on top (90% opacity)
      const wmsOpacity = this.pdf.GState({ opacity: 0.9 });
      this.pdf.setGState(wmsOpacity);

      this.pdf.addImage(
        capture.dataUrl,
        'PNG',
        mapX,
        mapY,
        MAP_SIZE,
        MAP_SIZE,
        undefined,
        'FAST'
      );

      // Reset to full opacity for legend and text
      const fullOpacityReset = this.pdf.GState({ opacity: 1.0 });
      this.pdf.setGState(fullOpacityReset);

      // Add legend if available (same height as map, 20% width)
      if (hasLegend) {
        // Simple white background for legend (no border)
        this.pdf.setFillColor(255, 255, 255);
        this.pdf.rect(legendX, mapY, LEGEND_WIDTH, MAP_SIZE, 'F');

        // Legend header
        this.pdf.setFontSize(9);
        this.pdf.setTextColor(71, 118, 56);
        this.pdf.text(this.t.legend, legendX + 3, mapY + 8);

        // Legend image - scale to fit within legend container
        const maxLegendHeight = MAP_SIZE - 15; // Leave space for header
        const maxLegendWidth = LEGEND_WIDTH - 6;

        // Calculate scaled dimensions while maintaining aspect ratio
        const legendAspect = legend.width / legend.height;
        let scaledWidth = maxLegendWidth;
        let scaledHeight = scaledWidth / legendAspect;

        if (scaledHeight > maxLegendHeight) {
          scaledHeight = maxLegendHeight;
          scaledWidth = scaledHeight * legendAspect;
        }

        try {
          this.pdf.addImage(
            legend.dataUrl,
            'PNG',
            legendX + 3,
            mapY + 12,
            scaledWidth,
            scaledHeight,
            undefined,
            'FAST'
          );
        } catch (legendError) {
          console.warn('Failed to add legend image:', legendError);
          this.pdf.setFontSize(7);
          this.pdf.setTextColor(150, 150, 150);
          this.pdf.text('(Legenda niet', legendX + 3, mapY + 25);
          this.pdf.text('beschikbaar)', legendX + 3, mapY + 32);
        }
      }
    } catch (error) {
      // Draw placeholder box if image fails
      this.pdf.setFillColor(240, 240, 240);
      this.pdf.rect(mapX, mapY, MAP_SIZE, MAP_SIZE, 'F');
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(150, 150, 150);
      this.pdf.text(this.t.noData, mapX + MAP_SIZE / 2, mapY + MAP_SIZE / 2, { align: 'center' });
    }

    // Position below the map+legend pair
    this.currentY = mapY + MAP_SIZE + 10;

    // Score markers in the left 4cm space (if grading data available)
    if (gradingResult) {
      const layerCfg = getLayerConfig(gradingResult.layer_id);
      const unit = layerCfg?.unit || '';
      const scoreX = WMS_MARGIN;
      let scoreY = this.currentY;

      // Draw score markers as simple indicators
      const drawScoreMarker = (label: string, value: number | string, y: number) => {
        // Circle marker
        this.pdf.setFillColor(71, 118, 56);
        this.pdf.circle(scoreX + 4, y - 1.5, 3, 'F');

        // Value inside or next to marker
        this.pdf.setFontSize(7);
        this.pdf.setTextColor(255, 255, 255);

        // Score value (larger, bold)
        this.pdf.setFontSize(11);
        this.pdf.setTextColor(50, 50, 50);
        this.pdf.setFont('helvetica', 'bold');
        const valueStr = typeof value === 'number' ? this.formatValue(value) : value;
        this.pdf.text(valueStr, scoreX + 10, y);

        // Unit and label (smaller, below)
        this.pdf.setFontSize(7);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(100, 100, 100);
        this.pdf.text(`${unit}`, scoreX + 10, y + 4);
        this.pdf.text(label, scoreX + 10, y + 8);

        return y + 18; // Return next Y position
      };

      // Show available score types as markers
      const avgValue = gradingResult.average_area_sample?.value;
      if (avgValue !== undefined && avgValue !== null) {
        scoreY = drawScoreMarker(
          this.locale === 'nl' ? 'Gem. gebied' : 'Avg. area',
          avgValue,
          scoreY
        );
      }

      const maxValue = gradingResult.max_area_sample?.value;
      if (maxValue !== undefined && maxValue !== null) {
        scoreY = drawScoreMarker(
          this.locale === 'nl' ? 'Max. gebied' : 'Max. area',
          maxValue,
          scoreY
        );
      }

      const pointValue = gradingResult.point_sample?.value;
      if (pointValue !== undefined && pointValue !== null) {
        scoreY = drawScoreMarker(
          this.locale === 'nl' ? 'Puntwaarde' : 'Point value',
          pointValue,
          scoreY
        );
      }
    }

    // Title (indented 4cm to make room for score markers)
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(50, 50, 50);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(layerConfig.title, WMS_MARGIN + TEXT_INDENT, this.currentY);
    this.currentY += 8;

    // Description (indented 4cm)
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(80, 80, 80);
    const descWidth = WMS_CONTENT_WIDTH - TEXT_INDENT;
    const descLines = this.pdf.splitTextToSize(layerConfig.description, descWidth);
    this.pdf.text(descLines, WMS_MARGIN + TEXT_INDENT, this.currentY);
    this.currentY += descLines.length * 4 + 10;
  }

  /**
   * Add target group scenario with ranking table
   */
  addTargetGroupScenario(
    scenarioName: string,
    scenarioPositions: number[],
    allPersonaScores: PersonaScore[],
    personas: ComprehensivePdfData['personas']
  ): void {
    this.addSubsectionTitle(`${this.t.scenario} ${scenarioName}`);

    // Get personas for this scenario
    const scenarioPersonas = scenarioPositions
      .map(pos => allPersonaScores[pos - 1])
      .filter((p): p is PersonaScore => p !== undefined);

    // Create table rows
    const headers = [this.t.rank, this.t.persona, this.t.matchScore];
    const rows = scenarioPersonas.map((ps, index) => {
      const persona = personas.find(p => p.id === ps.personaId);
      const matchPct = ps.maxPossibleScore > 0
        ? (ps.rRank / ps.maxPossibleScore) * 100
        : 0;
      return [
        `${index + 1}`,
        persona?.name || ps.personaId,
        `${matchPct.toFixed(1)}%`
      ];
    });

    this.addTable(headers, rows, {
      columnWidths: [20, CONTENT_WIDTH - 60, 40]
    });
  }

  /**
   * Add complete target group rankings table with all 27 personas
   * Shows: R-Rank Position, Z-Rank Position, Doelgroep, R-Rank Score, Z-Rank Score, Gewogen Totaal
   */
  addTargetGroupRankings(
    personaScores: PersonaScore[],
    personas: ComprehensivePdfData['personas']
  ): void {
    // Title for complete ranking table
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(71, 118, 56);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.completeRankingTitle, MARGIN, this.currentY);
    this.currentY += 5;

    // Subtitle
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(100, 100, 100);
    this.pdf.text(this.t.completeRankingSubtitle, MARGIN, this.currentY);
    this.currentY += 8;

    // Sort by R-Rank position (all 27 personas)
    const sorted = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);

    // Table headers with correct columns
    const headers = [
      this.t.rRankPosition,
      this.t.zRankPosition,
      this.t.persona,
      this.t.rRankScore,
      this.t.zRankScore,
      this.t.weightedTotal
    ];

    // All 27 rows
    const rows = sorted.map((ps) => {
      const persona = personas.find(p => p.id === ps.personaId);
      // R-Rank Score is a percentage (0-1 → 0-100%)
      const rRankScoreFormatted = `${(ps.rRank * 100).toFixed(1)}%`;
      // Z-Rank Score is normalized (-1 to 1)
      const zRankScoreFormatted = ps.zRank.toFixed(3);
      // Weighted Total
      const weightedTotalFormatted = ps.weightedTotal.toFixed(2);

      return [
        `${ps.rRankPosition}`,
        `${ps.zRankPosition}`,
        persona?.name || ps.personaName || ps.personaId,
        rRankScoreFormatted,
        zRankScoreFormatted,
        weightedTotalFormatted
      ];
    });

    // Use smaller column widths to fit all columns
    this.addTable(headers, rows, {
      columnWidths: [18, 18, CONTENT_WIDTH - 90, 22, 18, 22]
    });
  }

  /**
   * Add target group calculations breakdown
   */
  addTargetGroupCalculations(
    personaScores: PersonaScore[],
    personas: ComprehensivePdfData['personas']
  ): void {
    this.addSubsectionTitle(this.t.targetGroupCalculations);

    // Get top 5 personas
    const topPersonas = [...personaScores]
      .sort((a, b) => a.rRankPosition - b.rRankPosition)
      .slice(0, 5);

    topPersonas.forEach((ps) => {
      const persona = personas.find(p => p.id === ps.personaId);
      if (!persona) return;

      this.checkPageBreak(40);

      // Persona header
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(71, 118, 56);
      this.pdf.text(`${ps.rRankPosition}. ${persona.name}`, MARGIN, this.currentY);
      this.currentY += 6;

      // Score breakdown
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(80, 80, 80);

      const matchPct = ps.maxPossibleScore > 0
        ? (ps.rRank / ps.maxPossibleScore) * 100
        : 0;

      const scores = [
        `${this.t.matchScore}: ${matchPct.toFixed(1)}%`,
        `Income: ${persona.income_level}`,
        `Household: ${persona.household_type}`,
        `Age: ${persona.age_group}`
      ];

      scores.forEach(score => {
        this.pdf.text(`• ${score}`, MARGIN + 5, this.currentY);
        this.currentY += 5;
      });

      this.currentY += 5;
    });
  }

  /**
   * Add data table section (demographics, health, etc.)
   */
  addDataTableSection(
    title: string,
    data: UnifiedDataRow[],
    levelLabel: string
  ): void {
    this.addSubsectionTitle(`${title} - ${levelLabel}`);

    if (!data || data.length === 0) {
      this.addParagraph(this.t.noData);
      return;
    }

    const headers = [this.t.indicator, this.t.value];
    const rows = data.slice(0, 20).map(row => [
      row.title || row.key,
      row.displayRelative || row.displayAbsolute || '-'
    ]);

    this.addTable(headers, rows, {
      columnWidths: [CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4]
    });
  }

  /**
   * Add score overview section with category breakdown
   */
  addScoreOverview(
    locationData: UnifiedLocationData,
    amenitiesScore: number
  ): void {
    this.startSection(this.t.scoreOverview);

    // Calculate all category scores from actual data (same as UI)
    const omgevingData = getOmgevingChartData(locationData, amenitiesScore, this.locale);

    // Convert to categories format for the bar chart
    const categories = omgevingData.map(item => ({
      name: item.name,
      score: item.value
    }));

    this.addSubsectionTitle(this.t.categoryScores);

    // Draw simple bar chart
    const barHeight = 12;
    const maxBarWidth = CONTENT_WIDTH - 60;

    categories.forEach(cat => {
      this.checkPageBreak(barHeight + 8);

      // Label
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(50, 50, 50);
      this.pdf.text(cat.name, MARGIN, this.currentY);

      // Score bar background
      this.pdf.setFillColor(240, 240, 240);
      this.pdf.roundedRect(MARGIN + 50, this.currentY - 5, maxBarWidth, barHeight, 2, 2, 'F');

      // Score bar fill
      const barWidth = (cat.score / 100) * maxBarWidth;
      this.pdf.setFillColor(71, 118, 56);
      this.pdf.roundedRect(MARGIN + 50, this.currentY - 5, barWidth, barHeight, 2, 2, 'F');

      // Score value
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.text(`${cat.score}`, MARGIN + 50 + barWidth - 15, this.currentY + 1);

      this.currentY += barHeight + 6;
    });

    this.currentY += 10;
  }

  /**
   * Add WMS grading summary
   */
  addWMSGradingSummary(gradingData: WMSGradingData): void {
    this.addSubsectionTitle(this.t.criticalLayers);

    // Get critical layers
    const criticalLayers = getCriticalLayers();

    // Group by category
    const categories: Record<string, Array<{ name: string; value: string; unit: string }>> = {
      airQuality: [],
      noise: [],
      nature: [],
      climate: []
    };

    criticalLayers.forEach(layer => {
      const result = gradingData.layers[layer.layerId];
      if (!result) return;

      const value = result.point_sample?.value ??
                    result.average_area_sample?.value ??
                    result.max_area_sample?.value;

      if (value === undefined) return;

      const config = getLayerConfig(layer.layerId);
      categories[layer.category]?.push({
        name: result.layer_name,
        value: this.formatValue(value),
        unit: config?.unit || ''
      });
    });

    Object.entries(categories).forEach(([catKey, items]) => {
      if (items.length === 0) return;

      const catName = this.t[catKey as keyof typeof this.t] || catKey;
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(71, 118, 56);
      this.pdf.text(catName as string, MARGIN, this.currentY);
      this.currentY += 6;

      items.forEach(item => {
        this.pdf.setFontSize(9);
        this.pdf.setTextColor(80, 80, 80);
        this.pdf.text(`• ${item.name}: ${item.value} ${item.unit}`, MARGIN + 5, this.currentY);
        this.currentY += 5;
      });

      this.currentY += 3;
    });
  }

  /**
   * Add amenities summary
   */
  addAmenitiesSummary(amenitiesData: AmenityMultiCategoryResponse): void {
    this.addSubsectionTitle(this.t.amenitiesNearby);

    const results = amenitiesData.results || [];
    // Take up to 10 categories
    const categoriesToShow = results.slice(0, 10);

    const headers = [this.t.category, this.t.count, this.t.distance];
    const rows = categoriesToShow.map((result: AmenitySearchResult) => {
      const nearest = result.places?.[0];
      return [
        result.category?.displayName || result.category?.id?.replace(/_/g, ' ') || '-',
        (result.places?.length || 0).toString(),
        nearest?.distance ? `${Math.round(nearest.distance)}m` : '-'
      ];
    });

    this.addTable(headers, rows, {
      columnWidths: [CONTENT_WIDTH * 0.5, CONTENT_WIDTH * 0.25, CONTENT_WIDTH * 0.25]
    });
  }

  /**
   * Add a cube visualization page for a scenario with persona cards
   * Layout: Cube at top, 4 persona cards below in 2x2 grid
   */
  addCubeVisualizationPage(
    cubeCapture: CubeCaptureResult,
    scenarioTitle: string,
    scenarioDescription: string,
    scenarioPersonas?: Array<{
      id: string;
      name: string;
      income_level: string;
      household_type: string;
      age_group: string;
      description: string;
      current_situation?: string;
      desired_situation?: string;
      current_property_types?: string[];
      desired_property_types?: string[];
      imageDataUrl?: string;
    }>
  ): void {
    // Start new page for this scenario
    this.addNewPage();

    // Title
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(71, 118, 56);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(scenarioTitle, MARGIN, this.currentY);
    this.currentY += 6;

    // Description (compact)
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(80, 80, 80);
    const descLines = this.pdf.splitTextToSize(scenarioDescription, CONTENT_WIDTH);
    this.pdf.text(descLines.slice(0, 2), MARGIN, this.currentY);
    this.currentY += 8;

    // Cube size - smaller to fit cards below
    const cubeSize = 80;
    const cubeX = MARGIN + (CONTENT_WIDTH - cubeSize) / 2;

    try {
      this.pdf.addImage(
        cubeCapture.dataUrl, 'PNG',
        cubeX, this.currentY, cubeSize, cubeSize,
        undefined, 'FAST'
      );
    } catch {
      this.pdf.setFillColor(245, 245, 245);
      this.pdf.rect(cubeX, this.currentY, cubeSize, cubeSize, 'F');
    }

    this.currentY += cubeSize + 5;

    // Cube explanation (compact)
    this.pdf.setFontSize(7);
    this.pdf.setTextColor(100, 100, 100);
    const explainText = this.locale === 'nl'
      ? 'Kubus: Inkomen (X), Leeftijd (Y), Huishoudtype (Z). Gekleurde blokken = geselecteerde doelgroepen.'
      : 'Cube: Income (X), Age (Y), Household type (Z). Colored blocks = selected target groups.';
    this.pdf.text(explainText, MARGIN, this.currentY);
    this.currentY += 8;

    // Add persona cards in 2x2 grid below cube
    if (scenarioPersonas && scenarioPersonas.length > 0) {
      this.addCompactPersonaCards(scenarioPersonas.slice(0, 4));
    }
  }

  /**
   * Add compact persona cards (4 cards on same page as cube)
   * Styled to match website design with image, stat boxes, description, and situations
   */
  private addCompactPersonaCards(
    personas: Array<{
      id: string;
      name: string;
      income_level: string;
      household_type: string;
      age_group: string;
      description: string;
      current_situation?: string;
      desired_situation?: string;
      current_property_types?: string[];
      desired_property_types?: string[];
      imageDataUrl?: string;
    }>
  ): void {
    const cardWidth = (CONTENT_WIDTH - 6) / 2; // 2 cards per row with gap
    const cardHeight = 82; // Taller cards to fit all info like website
    const cardGap = 5;
    const padding = 4;

    personas.forEach((persona, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cardX = MARGIN + col * (cardWidth + cardGap);
      const cardY = this.currentY + row * (cardHeight + cardGap);

      // Card background with subtle border (like website)
      this.pdf.setFillColor(255, 255, 255);
      this.pdf.setDrawColor(229, 231, 235);
      this.pdf.setLineWidth(0.3);
      this.pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

      let y = cardY + padding;

      // === TOP SECTION: Image on left, Name + Stats on right ===
      const imageSize = 28; // Square image
      const rightSectionX = cardX + padding + imageSize + 4;
      const rightSectionWidth = cardWidth - imageSize - padding * 2 - 4;

      // Image (square, properly sized)
      if (persona.imageDataUrl) {
        try {
          this.pdf.addImage(
            persona.imageDataUrl, 'PNG',
            cardX + padding, y,
            imageSize, imageSize,
            undefined, 'FAST'
          );
        } catch {
          this.pdf.setFillColor(243, 244, 246);
          this.pdf.rect(cardX + padding, y, imageSize, imageSize, 'F');
        }
      } else {
        this.pdf.setFillColor(243, 244, 246);
        this.pdf.rect(cardX + padding, y, imageSize, imageSize, 'F');
      }

      // Name (bold, to right of image)
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(17, 24, 39);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(persona.name, rightSectionX, y + 5);

      // Three stat boxes below name (like website design)
      const statBoxY = y + 8;
      const statBoxWidth = (rightSectionWidth - 2) / 3;
      const statBoxHeight = 9;
      const labels = [
        this.locale === 'nl' ? 'Inkomen' : 'Income',
        this.locale === 'nl' ? 'Leeftijd' : 'Age',
        this.locale === 'nl' ? 'Huishouden' : 'Household'
      ];
      const values = [persona.income_level, persona.age_group, persona.household_type];

      for (let i = 0; i < 3; i++) {
        const boxX = rightSectionX + i * (statBoxWidth + 1);

        // Stat box background
        this.pdf.setFillColor(249, 250, 251);
        this.pdf.roundedRect(boxX, statBoxY, statBoxWidth, statBoxHeight, 1, 1, 'F');

        // Label
        this.pdf.setFontSize(5);
        this.pdf.setTextColor(107, 114, 128);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(labels[i], boxX + 1.5, statBoxY + 3);

        // Value (truncate if needed)
        this.pdf.setFontSize(5);
        this.pdf.setTextColor(17, 24, 39);
        this.pdf.setFont('helvetica', 'bold');
        const valueText = this.pdf.splitTextToSize(values[i] || '-', statBoxWidth - 3)[0];
        this.pdf.text(valueText, boxX + 1.5, statBoxY + 7);
      }

      // === DESCRIPTION SECTION (below image, full width) ===
      y += imageSize + 4;
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(6);
      this.pdf.setTextColor(55, 65, 81);
      const descLines = this.pdf.splitTextToSize(persona.description || '', cardWidth - padding * 2);
      descLines.slice(0, 2).forEach((line: string, lineIndex: number) => {
        this.pdf.text(line, cardX + padding, y + lineIndex * 2.5);
      });
      y += 7;

      // === CURRENT SITUATION ===
      if (persona.current_situation || persona.current_property_types?.[0]) {
        this.pdf.setFontSize(5.5);
        this.pdf.setTextColor(71, 118, 56);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(this.locale === 'nl' ? 'Huidige Situatie:' : 'Current:', cardX + padding, y);

        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(75, 85, 99);
        if (persona.current_property_types?.[0]) {
          const currentText = this.pdf.splitTextToSize(persona.current_property_types[0], cardWidth - padding * 2 - 25)[0];
          this.pdf.text(currentText, cardX + padding + 22, y);
        }
        y += 4;
      }

      // === DESIRED SITUATION ===
      if (persona.desired_situation || persona.desired_property_types?.[0]) {
        this.pdf.setFontSize(5.5);
        this.pdf.setTextColor(71, 118, 56);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(this.locale === 'nl' ? 'Gewenste Situatie:' : 'Desired:', cardX + padding, y);

        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(75, 85, 99);
        if (persona.desired_property_types?.[0]) {
          const desiredText = this.pdf.splitTextToSize(persona.desired_property_types[0], cardWidth - padding * 2 - 25)[0];
          this.pdf.text(desiredText, cardX + padding + 22, y);
        }
      }
    });

    // Update Y position after all cards
    const totalRows = Math.ceil(personas.length / 2);
    this.currentY += totalRows * (cardHeight + cardGap);
  }

  /**
   * Add persona cards section to a page - Full version with all data
   * Shows 4 cards per page (2x2 grid) with complete information
   */
  private addPersonaCardsSection(
    personas: Array<{
      id: string;
      name: string;
      income_level: string;
      household_type: string;
      age_group: string;
      description: string;
      current_situation?: string;
      desired_situation?: string;
      current_property_types?: string[];
      desired_property_types?: string[];
      imageDataUrl?: string;
    }>
  ): void {
    // Full-page cards: 2x2 grid layout
    const cardWidth = (CONTENT_WIDTH - 6) / 2; // 2 cards per row with gap
    const cardHeight = 115; // Fixed height to fit 2 rows per page
    const cardGap = 6;
    const imageHeight = 35; // Smaller image for compact layout

    // Draw cards in 2-column grid
    personas.forEach((persona, index) => {
      // Check if we need a new page (every 4 cards or if space insufficient)
      const rowIndex = Math.floor(index / 2);
      if (index > 0 && index % 4 === 0) {
        this.addNewPage();
      }

      const col = index % 2;
      const row = rowIndex % 2;
      const cardX = MARGIN + col * (cardWidth + cardGap);
      const cardY = this.currentY + row * (cardHeight + cardGap);

      // Card background with border
      this.pdf.setFillColor(255, 255, 255);
      this.pdf.setDrawColor(229, 231, 235);
      this.pdf.roundedRect(cardX, cardY, cardWidth, cardHeight, 2, 2, 'FD');

      let y = cardY + 3;

      // Top section: Image on left, name + stats on right
      const imageWidth = 35;

      // Image
      if (persona.imageDataUrl) {
        try {
          this.pdf.addImage(
            persona.imageDataUrl, 'PNG',
            cardX + 3, y, imageWidth, imageHeight, undefined, 'FAST'
          );
        } catch {
          this.pdf.setFillColor(243, 244, 246);
          this.pdf.rect(cardX + 3, y, imageWidth, imageHeight, 'F');
        }
      } else {
        this.pdf.setFillColor(243, 244, 246);
        this.pdf.rect(cardX + 3, y, imageWidth, imageHeight, 'F');
      }

      // Name (to the right of image)
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(17, 24, 39);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(persona.name, cardX + imageWidth + 8, y + 5);

      // Three stat boxes next to image
      const statStartX = cardX + imageWidth + 8;
      const statBoxWidth = (cardWidth - imageWidth - 14) / 3;
      const labels = [
        this.locale === 'nl' ? 'Inkomen' : 'Income',
        this.locale === 'nl' ? 'Leeftijd' : 'Age',
        this.locale === 'nl' ? 'Huishouden' : 'Household'
      ];
      const values = [persona.income_level, persona.age_group, persona.household_type];

      for (let i = 0; i < 3; i++) {
        const boxX = statStartX + i * (statBoxWidth + 1);
        const boxY = y + 9;

        this.pdf.setFillColor(249, 250, 251);
        this.pdf.roundedRect(boxX, boxY, statBoxWidth, 11, 1, 1, 'F');

        this.pdf.setFontSize(5);
        this.pdf.setTextColor(75, 85, 99);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(labels[i], boxX + 2, boxY + 4);

        this.pdf.setFontSize(5);
        this.pdf.setTextColor(17, 24, 39);
        this.pdf.setFont('helvetica', 'bold');
        const valueText = this.pdf.splitTextToSize(values[i] || '-', statBoxWidth - 4)[0];
        this.pdf.text(valueText, boxX + 2, boxY + 8);
      }

      // Description (below image)
      y += imageHeight + 5;
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(6);
      this.pdf.setTextColor(55, 65, 81);
      const descLines = this.pdf.splitTextToSize(persona.description || '', cardWidth - 8);
      this.pdf.text(descLines.slice(0, 2), cardX + 3, y);
      y += 8;

      // Current Situation section
      if (persona.current_situation) {
        this.pdf.setFontSize(6);
        this.pdf.setTextColor(71, 118, 56);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(this.locale === 'nl' ? 'Huidige Situatie' : 'Current Situation', cardX + 3, y);
        y += 4;

        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(55, 65, 81);
        const currentLines = this.pdf.splitTextToSize(persona.current_situation, cardWidth - 8);
        this.pdf.text(currentLines.slice(0, 2), cardX + 3, y);
        y += 8;

        // Current Housing Types
        if (persona.current_property_types && persona.current_property_types.length > 0) {
          this.pdf.setFontSize(5);
          this.pdf.setTextColor(100, 100, 100);
          const currentTypes = persona.current_property_types.slice(0, 2).join(', ');
          this.pdf.text(`${this.locale === 'nl' ? 'Woningtype' : 'Housing'}: ${currentTypes}`, cardX + 3, y);
          y += 5;
        }
      }

      // Desired Situation section
      if (persona.desired_situation) {
        this.pdf.setFontSize(6);
        this.pdf.setTextColor(71, 118, 56);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(this.locale === 'nl' ? 'Gewenste Situatie' : 'Desired Situation', cardX + 3, y);
        y += 4;

        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(55, 65, 81);
        const desiredLines = this.pdf.splitTextToSize(persona.desired_situation, cardWidth - 8);
        this.pdf.text(desiredLines.slice(0, 2), cardX + 3, y);
        y += 8;

        // Desired Housing Types
        if (persona.desired_property_types && persona.desired_property_types.length > 0) {
          this.pdf.setFontSize(5);
          this.pdf.setTextColor(100, 100, 100);
          const desiredTypes = persona.desired_property_types.slice(0, 2).join(', ');
          this.pdf.text(`${this.locale === 'nl' ? 'Woningtype' : 'Housing'}: ${desiredTypes}`, cardX + 3, y);
        }
      }

      // Update Y position after completing a row of 2 cards
      if (col === 1 || index === personas.length - 1) {
        if (row === 1 || index === personas.length - 1) {
          this.currentY = cardY + cardHeight + cardGap;
        }
      }
    });

    // Ensure currentY is updated after all cards
    if (personas.length > 0) {
      const lastRowIndex = Math.floor((personas.length - 1) / 2) % 2;
      this.currentY += (lastRowIndex + 1) * (cardHeight + cardGap);
    }
  }

  /**
   * Add introduction section (LLM-generated or placeholder)
   */
  addIntroductionSection(introText?: string): void {
    this.addSubsectionTitle(this.t.introduction);

    if (introText && introText.trim().length > 0) {
      // Split into paragraphs and add them
      const paragraphs = introText.split('\n\n');
      paragraphs.forEach(paragraph => {
        if (paragraph.trim()) {
          this.addParagraph(paragraph.trim());
        }
      });
    } else {
      // Placeholder text
      const placeholder = this.locale === 'nl'
        ? 'Dit gedeelte wordt ingevuld met een door AI gegenereerde introductie van de locatieanalyse. De introductie zal een samenvatting bevatten van de belangrijkste bevindingen en aanbevelingen voor de doelgroepen.'
        : 'This section will be filled with an AI-generated introduction to the location analysis. The introduction will contain a summary of the key findings and recommendations for the target groups.';

      this.pdf.setFontSize(10);
      this.pdf.setTextColor(150, 150, 150);
      this.pdf.setFont('helvetica', 'italic');
      const lines = this.pdf.splitTextToSize(placeholder, CONTENT_WIDTH);
      this.pdf.text(lines, MARGIN, this.currentY);
      this.pdf.setFont('helvetica', 'normal');
      this.currentY += lines.length * 5 + 10;
    }
  }

  /**
   * Add PVE (Programma van Eisen) section
   */
  addPVESection(pveData: ComprehensivePdfData['pveData']): void {
    this.addSubsectionTitle(this.t.pveSection);

    if (!pveData || (!pveData.totalM2 && !pveData.percentages)) {
      const noData = this.locale === 'nl'
        ? 'Geen Programma van Eisen data beschikbaar.'
        : 'No Program of Requirements data available.';
      this.addParagraph(noData);
      return;
    }

    // Total area
    if (pveData.totalM2) {
      this.pdf.setFontSize(11);
      this.pdf.setTextColor(50, 50, 50);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`${this.t.totalArea}: ${pveData.totalM2.toLocaleString()} m²`, MARGIN, this.currentY);
      this.pdf.setFont('helvetica', 'normal');
      this.currentY += 8;
    }

    // Preset name if available
    if (pveData.presetId) {
      const presetLabels: Record<string, { nl: string; en: string }> = {
        'mixed-residential': { nl: 'Gemengd Wonen', en: 'Mixed Residential' },
        'urban-retail': { nl: 'Stedelijk Retail', en: 'Urban Retail' },
        'community': { nl: 'Gemeenschap', en: 'Community' },
        'custom': { nl: 'Aangepast', en: 'Custom' }
      };
      const presetLabel = presetLabels[pveData.presetId]?.[this.locale] || pveData.presetId;

      this.pdf.setFontSize(9);
      this.pdf.setTextColor(100, 100, 100);
      this.pdf.text(`Preset: ${presetLabel}`, MARGIN, this.currentY);
      this.currentY += 6;
    }

    // Allocations table
    if (pveData.percentages) {
      this.currentY += 4;
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(71, 118, 56);
      this.pdf.text(this.t.pveAllocations, MARGIN, this.currentY);
      this.currentY += 6;

      const allocations = [
        { label: this.t.apartments, value: pveData.percentages.apartments },
        { label: this.t.commercial, value: pveData.percentages.commercial },
        { label: this.t.hospitality, value: pveData.percentages.hospitality },
        { label: this.t.social, value: pveData.percentages.social },
        { label: this.t.communal, value: pveData.percentages.communal },
        { label: this.t.offices, value: pveData.percentages.offices },
      ].filter(a => a.value > 0);

      // Draw simple bar chart for allocations
      const barHeight = 10;
      const maxBarWidth = CONTENT_WIDTH - 70;

      allocations.forEach(alloc => {
        this.checkPageBreak(barHeight + 4);

        // Label
        this.pdf.setFontSize(9);
        this.pdf.setTextColor(50, 50, 50);
        this.pdf.text(alloc.label, MARGIN, this.currentY);

        // Bar background
        this.pdf.setFillColor(240, 240, 240);
        this.pdf.roundedRect(MARGIN + 55, this.currentY - 5, maxBarWidth, barHeight, 2, 2, 'F');

        // Bar fill (percentage based)
        const barWidth = (alloc.value / 100) * maxBarWidth;
        this.pdf.setFillColor(71, 118, 56);
        this.pdf.roundedRect(MARGIN + 55, this.currentY - 5, barWidth, barHeight, 2, 2, 'F');

        // Percentage and m² value
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(50, 50, 50);
        const m2Value = pveData.totalM2 ? Math.round((alloc.value / 100) * pveData.totalM2) : 0;
        const valueText = pveData.totalM2
          ? `${alloc.value}% (${m2Value.toLocaleString()} m²)`
          : `${alloc.value}%`;
        this.pdf.text(valueText, MARGIN + 55 + maxBarWidth + 3, this.currentY);

        this.currentY += barHeight + 4;
      });
    }

    this.currentY += 8;
  }

  /**
   * Add Omgeving (Environment) data section with category tables
   */
  addOmgevingDataSection(locationData: UnifiedLocationData, amenitiesScore: number): void {
    this.addSubsectionTitle(this.t.omgevingSection);

    // Get the Omgeving chart data (same as used in UI)
    const omgevingData = getOmgevingChartData(locationData, amenitiesScore, this.locale);

    // Show each category with its score
    omgevingData.forEach(item => {
      this.checkPageBreak(25);

      // Category name and score
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(71, 118, 56);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`${item.name}: ${item.value}`, MARGIN, this.currentY);
      this.pdf.setFont('helvetica', 'normal');
      this.currentY += 5;

      // Small score bar
      const barWidth = 60;
      const barHeight = 4;
      this.pdf.setFillColor(240, 240, 240);
      this.pdf.roundedRect(MARGIN, this.currentY, barWidth, barHeight, 1, 1, 'F');

      const fillWidth = (item.value / 100) * barWidth;
      this.pdf.setFillColor(71, 118, 56);
      this.pdf.roundedRect(MARGIN, this.currentY, fillWidth, barHeight, 1, 1, 'F');

      this.currentY += 10;
    });

    // Add note about data sources
    this.currentY += 5;
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(120, 120, 120);
    const note = this.locale === 'nl'
      ? 'Scores zijn berekend op basis van CBS, RIVM, Politie en Google Places data.'
      : 'Scores are calculated based on CBS, RIVM, Police and Google Places data.';
    this.pdf.text(note, MARGIN, this.currentY);
    this.currentY += 8;
  }

  /**
   * Add AI Building Program placeholder section
   */
  addAIBuildingProgramPlaceholder(): void {
    this.addSubsectionTitle(this.t.aiBuildingProgram);

    this.pdf.setFontSize(10);
    this.pdf.setTextColor(150, 150, 150);
    this.pdf.setFont('helvetica', 'italic');
    const lines = this.pdf.splitTextToSize(this.t.aiBuildingProgramPlaceholder, CONTENT_WIDTH);
    this.pdf.text(lines, MARGIN, this.currentY);
    this.pdf.setFont('helvetica', 'normal');
    this.currentY += lines.length * 5 + 10;
  }

  /**
   * Add detailed scoring table per category
   */
  addDetailedScoringTable(
    personaScores: PersonaScore[],
    personas: ComprehensivePdfData['personas']
  ): void {
    // Title
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(71, 118, 56);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.detailedScoringTitle, MARGIN, this.currentY);
    this.currentY += 5;

    // Subtitle
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(100, 100, 100);
    this.pdf.text(this.t.detailedScoringSubtitle, MARGIN, this.currentY);
    this.currentY += 10;

    // Get top 10 personas for detailed breakdown
    const topPersonas = [...personaScores]
      .sort((a, b) => a.rRankPosition - b.rRankPosition)
      .slice(0, 10);

    // Category labels
    const categoryLabels = {
      voorzieningen: this.locale === 'nl' ? 'Voorzieningen' : 'Amenities',
      leefbaarheid: this.locale === 'nl' ? 'Leefbaarheid' : 'Livability',
      woningvooraad: this.locale === 'nl' ? 'Woningvoorraad' : 'Housing Stock',
      demografie: this.locale === 'nl' ? 'Demografie' : 'Demographics'
    };

    // Table headers
    const headers = [
      this.t.persona,
      categoryLabels.voorzieningen,
      categoryLabels.leefbaarheid,
      categoryLabels.woningvooraad,
      categoryLabels.demografie,
      this.t.weightedTotal
    ];

    // Table rows
    const rows = topPersonas.map(ps => {
      const persona = personas.find(p => p.id === ps.personaId);
      return [
        persona?.name || ps.personaName || ps.personaId,
        ps.categoryScores.voorzieningen.toFixed(2),
        ps.categoryScores.leefbaarheid.toFixed(2),
        ps.categoryScores.woningvooraad.toFixed(2),
        ps.categoryScores.demografie.toFixed(2),
        ps.weightedTotal.toFixed(2)
      ];
    });

    this.addTable(headers, rows, {
      columnWidths: [CONTENT_WIDTH - 100, 20, 20, 20, 20, 20]
    });
  }

  /**
   * Check if we need a page break
   */
  private checkPageBreak(requiredSpace: number): void {
    if (this.currentY + requiredSpace > PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT) {
      this.addNewPage();
    }
  }

  /**
   * Add a new page
   */
  private addNewPage(): void {
    this.pdf.addPage();
    this.currentPage++;
    this.currentY = MARGIN + HEADER_HEIGHT;
    this.addHeader();
    this.addFooter();
  }

  /**
   * Add page header
   */
  private addHeader(): void {
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(150, 150, 150);
    this.pdf.text('GroosHub - Location Analysis Report', MARGIN, 10);
    this.pdf.setDrawColor(230, 230, 230);
    this.pdf.line(MARGIN, 12, PAGE_WIDTH - MARGIN, 12);
  }

  /**
   * Add page footer
   */
  private addFooter(): void {
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(150, 150, 150);
    this.pdf.text(
      `${this.t.page} ${this.currentPage}`,
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 10,
      { align: 'center' }
    );
  }

  /**
   * Format numeric value
   */
  private formatValue(value: number | string | null): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string') return value;
    return value.toFixed(2);
  }

  /**
   * Get the PDF document
   */
  getPdf(): jsPDF {
    return this.pdf;
  }

  /**
   * Save the PDF
   */
  save(filename: string): void {
    this.pdf.save(filename);
  }
}

/**
 * Generate comprehensive PDF report
 */
export async function generateComprehensivePdf(
  data: ComprehensivePdfData,
  options: ComprehensivePdfOptions,
  onProgress?: (current: number, total: number, status: string) => void
): Promise<void> {
  const {
    locale,
    title = translations[locale].title,
    filename = `location-report-${new Date().toISOString().split('T')[0]}.pdf`,
    includeWMSMaps = true,
    includeTargetGroups = true,
    includeDataTables = true,
    includeScoreOverview = true
  } = options;

  const t = translations[locale];
  const builder = new PdfBuilder(locale);

  // Calculate total steps for progress (new structure)
  const wmsLayers = Object.entries(WMS_CATEGORIES).flatMap(([catId, cat]) =>
    Object.entries(cat.layers).map(([layerId, config]) => ({ catId, layerId, config }))
  );
  const hasCubes = data.cubeColors && data.cubeColors.length > 0;
  const hasCustomScenario = data.scenarios.customScenario && data.scenarios.customScenario.length > 0;
  const totalSteps =
    1 + // Title page
    1 + // Introduction
    (includeTargetGroups && hasCubes ? (hasCustomScenario ? 4 : 3) : 0) + // Cube pages (3-4 scenarios)
    (includeTargetGroups ? 2 : 0) + // Rankings table + Detailed scoring table
    1 + // PVE section
    1 + // AI Building Program placeholder
    (includeScoreOverview ? 1 : 0) + // Omgeving section
    (includeDataTables ? 6 : 0) + // Demographics, health, safety, livability, residential, amenities
    (includeWMSMaps ? wmsLayers.length : 0);

  let currentStep = 0;
  const reportProgress = (status: string) => {
    currentStep++;
    onProgress?.(currentStep, totalSteps, status);
  };

  // Report initial progress immediately so UI doesn't show 0/0
  onProgress?.(0, totalSteps, locale === 'nl' ? 'Voorbereiden...' : 'Preparing...');

  // === NEW PAGE ORDER ===
  // 1. Title page
  builder.addTitlePage(title, data.address, data.coordinates);
  reportProgress(t.title);

  // 2. Table of contents placeholder
  const tocPage = builder.addTableOfContents();

  // 3. Introduction section (LLM text or placeholder)
  builder.startSection(t.introduction);
  builder.addIntroductionSection(data.introductionText);
  reportProgress(t.introduction);

  // Calculate amenities score (needed for multiple sections)
  let amenitiesScore = 50; // Default fallback
  if (data.amenitiesData?.results && Array.isArray(data.amenitiesData.results)) {
    const amenityScores = calculateAllAmenityScores(data.amenitiesData.results);
    const rawScore = amenityScores.reduce((sum: number, score: AmenityScore) => {
      return sum + score.countScore + score.proximityBonus;
    }, 0);
    amenitiesScore = Math.round(((rawScore + 21) / 63) * 90 + 10);
    amenitiesScore = Math.max(10, Math.min(100, amenitiesScore));
  }

  // 4-7. Scenario pages with cube + 4 cards (ONE page per scenario)
  if (includeTargetGroups && data.cubeColors && data.cubeColors.length > 0) {
    builder.startSection(t.scenarioCubes);

    // Report that cube capture is starting (this can take a while)
    onProgress?.(
      currentStep,
      totalSteps,
      locale === 'nl' ? 'Kubus visualisaties genereren...' : 'Generating cube visualizations...'
    );

    try {
      console.log('Capturing cube visualizations for PDF...');

      // Helper function to get personas for a scenario (from rRankPositions)
      const getScenarioPersonas = (positions: number[]) => {
        return positions
          .map(pos => {
            const personaScore = data.personaScores[pos - 1];
            if (!personaScore) return null;
            const persona = data.personas.find(p => p.id === personaScore.personaId);
            return persona || null;
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);
      };

      // Helper function to convert rRankPositions to cube indices (0-26)
      const positionsToCubeIndices = (positions: number[]): number[] => {
        return positions
          .map(pos => {
            const personaScore = data.personaScores[pos - 1];
            if (!personaScore) return -1;
            const persona = data.personas.find(p => p.id === personaScore.personaId);
            if (!persona) return -1;
            const { index } = getPersonaCubePosition({
              income_level: persona.income_level,
              age_group: persona.age_group,
              household_type: persona.household_type,
            });
            return index;
          })
          .filter(idx => idx !== -1);
      };

      // Convert scenario positions to cube indices
      const cubeIndicesScenario1 = positionsToCubeIndices(data.scenarios.scenario1);
      const cubeIndicesScenario2 = positionsToCubeIndices(data.scenarios.scenario2);
      const cubeIndicesScenario3 = positionsToCubeIndices(data.scenarios.scenario3);
      const cubeIndicesCustom = data.scenarios.customScenario
        ? positionsToCubeIndices(data.scenarios.customScenario)
        : undefined;

      // Capture all scenario cubes
      const cubeCaptures = await captureAllScenarioCubes(
        {
          scenario1: cubeIndicesScenario1,
          scenario2: cubeIndicesScenario2,
          scenario3: cubeIndicesScenario3,
          customScenario: cubeIndicesCustom,
        },
        data.cubeColors,
        { width: 800, height: 800, backgroundColor: '#ffffff' }
      );

      // Scenario 1
      builder.addCubeVisualizationPage(
        cubeCaptures.scenario1,
        t.scenario1Title,
        t.scenario1Desc,
        getScenarioPersonas(data.scenarios.scenario1)
      );
      reportProgress(t.scenario1Title);

      // Scenario 2
      builder.addCubeVisualizationPage(
        cubeCaptures.scenario2,
        t.scenario2Title,
        t.scenario2Desc,
        getScenarioPersonas(data.scenarios.scenario2)
      );
      reportProgress(t.scenario2Title);

      // Scenario 3
      builder.addCubeVisualizationPage(
        cubeCaptures.scenario3,
        t.scenario3Title,
        t.scenario3Desc,
        getScenarioPersonas(data.scenarios.scenario3)
      );
      reportProgress(t.scenario3Title);

      // Scenario 4 (Custom) if available
      if (cubeCaptures.customScenario && data.scenarios.customScenario) {
        builder.addCubeVisualizationPage(
          cubeCaptures.customScenario,
          t.customScenarioTitle,
          t.customScenarioDesc,
          getScenarioPersonas(data.scenarios.customScenario)
        );
        reportProgress(t.customScenarioTitle);
      }

      console.log('Cube visualizations added to PDF');
    } catch (error) {
      console.warn('Failed to capture cube visualizations:', error);
      builder.addParagraph(
        locale === 'nl'
          ? 'Kubus visualisaties konden niet worden gegenereerd.'
          : 'Cube visualizations could not be generated.'
      );
    }
  }

  // 8. Complete doelgroep ranking table (all 27 personas)
  if (includeTargetGroups) {
    builder.startSection(t.targetGroupSection);
    builder.addTargetGroupRankings(data.personaScores, data.personas);
    reportProgress(t.targetGroupRankings);

    // 9. Detailed score table per category
    builder.addDetailedScoringTable(data.personaScores, data.personas);
    reportProgress(t.detailedScoringTitle);
  }

  // 10. PVE data section
  builder.startSection(t.pveSection);
  builder.addPVESection(data.pveData);
  reportProgress(t.pveSection);

  // 11. AI Building Program placeholder
  builder.addAIBuildingProgramPlaceholder();
  reportProgress(t.aiBuildingProgram);

  // 12. Omgeving (Environment) data section
  if (includeScoreOverview) {
    builder.startSection(t.omgevingSection);
    builder.addOmgevingDataSection(data.locationData, amenitiesScore);

    // Also add WMS grading summary if available
    if (data.wmsGradingData) {
      builder.addWMSGradingSummary(data.wmsGradingData);
    }
    reportProgress(t.scoreOverview);
  }

  // Data Tables section
  if (includeDataTables) {
    builder.startSection(t.dataTablesSection);

    // Demographics
    if (data.locationData.demographics?.neighborhood?.length > 0) {
      builder.addDataTableSection(
        t.demographics,
        data.locationData.demographics.neighborhood,
        t.neighborhood
      );
    }
    reportProgress(t.demographics);

    // Health
    if (data.locationData.health?.neighborhood?.length > 0) {
      builder.addDataTableSection(
        t.health,
        data.locationData.health.neighborhood,
        t.neighborhood
      );
    }
    reportProgress(t.health);

    // Safety
    if (data.locationData.safety?.neighborhood?.length > 0) {
      builder.addDataTableSection(
        t.safety,
        data.locationData.safety.neighborhood,
        t.neighborhood
      );
    }
    reportProgress(t.safety);

    // Livability (only has national and municipality levels, not neighborhood)
    if (data.locationData.livability?.municipality?.length > 0) {
      builder.addDataTableSection(
        t.livability,
        data.locationData.livability.municipality,
        t.municipality
      );
    }
    reportProgress(t.livability);

    // Residential (structured differently - extract key market statistics)
    if (data.locationData.residential?.hasData) {
      const residential = data.locationData.residential;
      const residentialRows: string[][] = [];

      // Add key residential data as simple rows
      if (residential.targetProperty?.characteristics) {
        const chars = residential.targetProperty.characteristics;
        residentialRows.push([
          locale === 'nl' ? 'Woningtype' : 'House Type',
          chars.houseType || '-'
        ]);
        residentialRows.push([
          locale === 'nl' ? 'Bouwjaar' : 'Build Year',
          chars.buildYear?.toString() || '-'
        ]);
        residentialRows.push([
          locale === 'nl' ? 'Woonoppervlak' : 'Living Area',
          chars.innerSurfaceArea
            ? `${chars.innerSurfaceArea} m²`
            : '-'
        ]);
      }

      if (residential.referencePriceMean) {
        residentialRows.push([
          locale === 'nl' ? 'Referentieprijs (gemiddeld)' : 'Reference Price (avg)',
          residential.referencePriceMean.formatted || '-'
        ]);
      }

      if (residential.marketStatistics) {
        const stats = residential.marketStatistics;
        if (stats.averagePrice?.average) {
          residentialRows.push([
            locale === 'nl' ? 'Gemiddelde prijs' : 'Average Price',
            stats.averagePrice.formatted || `€${Math.round(stats.averagePrice.average)}`
          ]);
        }
        if (stats.totalReferences !== undefined) {
          residentialRows.push([
            locale === 'nl' ? 'Aantal referenties' : 'Reference Count',
            stats.totalReferences.toString()
          ]);
        }
      }

      if (residentialRows.length > 0) {
        builder.addSubsectionTitle(`${t.residential} - ${t.neighborhood}`);
        builder.addTable([t.indicator, t.value], residentialRows, {
          columnWidths: [CONTENT_WIDTH * 0.6, CONTENT_WIDTH * 0.4]
        });
      }
    }
    reportProgress(t.residential);

    // Amenities summary
    if (data.amenitiesData) {
      builder.addAmenitiesSummary(data.amenitiesData);
    }
    reportProgress(t.amenities);
  }

  // WMS Maps section
  if (includeWMSMaps) {
    builder.startSection(t.wmsMapSection);

    // Validate coordinates before attempting WMS downloads
    const [lat, lng] = data.coordinates;
    const hasValidCoordinates = isValidNetherlandsCoordinate(lat, lng);

    if (!hasValidCoordinates) {
      // Add a message explaining why maps are not available
      const noMapsMessage = locale === 'nl'
        ? 'Kaartlagen konden niet worden gegenereerd. De coördinaten zijn ongeldig of bevinden zich buiten Nederland. Controleer of de locatiegegevens correct zijn geladen.'
        : 'Map layers could not be generated. The coordinates are invalid or outside the Netherlands. Please verify the location data was loaded correctly.';

      builder.addParagraph(noMapsMessage);
      console.warn(`Invalid coordinates for WMS maps: [${lat}, ${lng}]. Maps section skipped.`);

      // Mark all WMS layer progress as complete (skipped)
      wmsLayers.forEach(layer => {
        if (layer.config.url !== 'amenity://') {
          reportProgress(`${layer.config.title} (skipped)`);
        }
      });
    } else {
      // Download aerial photos once per unique zoom level
      const uniqueZooms = new Set(wmsLayers.map(l => l.config.recommendedZoom || 15));
      const aerialPhotoCache: Record<number, MapCapture> = {};

      const aerialPhotoWMS = {
        url: 'https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0',
        layers: 'Actueel_orthoHR'
      };

      console.log(`Starting WMS map downloads for coordinates: [${lat}, ${lng}]`);

      for (const zoom of uniqueZooms) {
        try {
          const aerialPhoto = await downloadWMSTile({
            url: aerialPhotoWMS.url,
            layers: aerialPhotoWMS.layers,
            layerTitle: `Aerial - Zoom ${zoom}`,
            center: data.coordinates,
            zoom,
            width: 800,
            height: 800
          });
          aerialPhotoCache[zoom] = aerialPhoto;
          console.log(`Downloaded aerial photo for zoom ${zoom}`);
        } catch (error) {
          console.warn(`Failed to download aerial photo for zoom ${zoom}:`, error);
        }
      }

      // Track successful and failed downloads
      let successCount = 0;
      let failCount = 0;

      // Download and add each WMS layer with its legend
      for (const layer of wmsLayers) {
        // Skip amenity layers (they use markers, not WMS)
        if (layer.config.url === 'amenity://') continue;

        try {
          console.log(`Downloading WMS layer: ${layer.config.title}`);

          // Download map tile and legend in parallel
          const [capture, legend] = await Promise.all([
            downloadWMSTile({
              url: layer.config.url,
              layers: layer.config.layers,
              layerTitle: layer.config.title,
              center: data.coordinates,
              zoom: layer.config.recommendedZoom || 15,
              width: 800,
              height: 800
            }),
            // Download legend - catch errors separately to not fail the whole layer
            downloadWMSLegend(
              layer.config.url,
              layer.config.layers,
              layer.config.title
            ).catch(err => {
              console.warn(`Failed to download legend for ${layer.config.title}:`, err);
              return null;
            })
          ]);

          const aerialPhoto = aerialPhotoCache[layer.config.recommendedZoom || 15] || null;
          const gradingResult = data.wmsGradingData?.layers?.[layer.layerId];

          await builder.addWMSMap(capture, aerialPhoto, layer.config, gradingResult, legend);
          successCount++;
          reportProgress(layer.config.title);
        } catch (error) {
          console.warn(`Failed to add WMS map ${layer.config.title}:`, error);
          failCount++;
          reportProgress(layer.config.title);
        }
      }

      console.log(`WMS map downloads complete: ${successCount} successful, ${failCount} failed`);
    }
  }

  // Update table of contents
  builder.updateTableOfContents(tocPage);

  // Save the PDF
  builder.save(filename);
}
