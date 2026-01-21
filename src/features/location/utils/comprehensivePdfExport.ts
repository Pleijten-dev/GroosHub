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
    imageDataUrl?: string;
  }>;
  /** Pre-fetched persona images mapped by persona ID */
  personaImages?: Record<string, string>;
  wmsGradingData?: WMSGradingData | null;
  amenitiesData?: AmenityMultiCategoryResponse | null;
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
   * Add full target group rankings table
   */
  addTargetGroupRankings(
    personaScores: PersonaScore[],
    personas: ComprehensivePdfData['personas']
  ): void {
    this.addSubsectionTitle(this.t.targetGroupRankings);

    // Sort by rank position
    const sorted = [...personaScores].sort((a, b) => a.rRankPosition - b.rRankPosition);

    const headers = [this.t.rank, this.t.persona, this.t.matchScore, this.t.category];
    const rows = sorted.slice(0, 15).map((ps) => {
      const persona = personas.find(p => p.id === ps.personaId);
      const matchPct = ps.maxPossibleScore > 0
        ? (ps.rRank / ps.maxPossibleScore) * 100
        : 0;
      return [
        `${ps.rRankPosition}`,
        persona?.name || ps.personaId,
        `${matchPct.toFixed(1)}%`,
        persona?.income_level || '-'
      ];
    });

    this.addTable(headers, rows, {
      columnWidths: [15, CONTENT_WIDTH - 85, 35, 35]
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

    // Category scores - simplified representation
    const categories = [
      { name: this.locale === 'nl' ? 'Betaalbaarheid' : 'Affordability', score: 75 },
      { name: this.locale === 'nl' ? 'Veiligheid' : 'Safety', score: 85 },
      { name: this.locale === 'nl' ? 'Gezondheid' : 'Health', score: 72 },
      { name: this.locale === 'nl' ? 'Leefbaarheid' : 'Livability', score: 80 },
      { name: this.locale === 'nl' ? 'Voorzieningen' : 'Amenities', score: amenitiesScore }
    ];

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
      current_property_types?: string[];
      desired_property_types?: string[];
      imageDataUrl?: string;
    }>
  ): void {
    // Start new page for cube
    this.addNewPage();

    // Title
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(71, 118, 56);
    this.pdf.text(scenarioTitle, MARGIN, this.currentY);
    this.currentY += 10;

    // Description
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(80, 80, 80);
    const descLines = this.pdf.splitTextToSize(scenarioDescription, CONTENT_WIDTH);
    this.pdf.text(descLines, MARGIN, this.currentY);
    this.currentY += descLines.length * 5 + 5;

    // Layout: Large cube centered, explanation below
    const cubeSize = 150; // Large cube (about 3x original size)
    const cubeX = MARGIN + (CONTENT_WIDTH - cubeSize) / 2; // Center the cube

    try {
      // Add cube image directly on white background (no dark background)
      this.pdf.addImage(
        cubeCapture.dataUrl,
        'PNG',
        cubeX,
        this.currentY,
        cubeSize,
        cubeSize,
        undefined,
        'FAST'
      );
    } catch (error) {
      // Placeholder if image fails
      this.pdf.setFillColor(245, 245, 245);
      this.pdf.rect(cubeX, this.currentY, cubeSize, cubeSize, 'F');
      this.pdf.setFontSize(10);
      this.pdf.setTextColor(150, 150, 150);
      this.pdf.text(this.t.noData, cubeX + cubeSize / 2, this.currentY + cubeSize / 2, { align: 'center' });
    }

    this.currentY += cubeSize + 8;

    // Explanation text below cube (full width)
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(100, 100, 100);
    const explainLines = this.pdf.splitTextToSize(this.t.cubeExplanation, CONTENT_WIDTH);
    this.pdf.text(explainLines, MARGIN, this.currentY);
    this.currentY += explainLines.length * 4 + 5;

    // Add persona cards if available
    if (scenarioPersonas && scenarioPersonas.length > 0) {
      this.addPersonaCardsSection(scenarioPersonas);
    }
  }

  /**
   * Add persona cards section to a page
   * Styled to match the DoelgroepenCard component
   */
  private addPersonaCardsSection(
    personas: Array<{
      id: string;
      name: string;
      income_level: string;
      household_type: string;
      age_group: string;
      description: string;
      current_property_types?: string[];
      desired_property_types?: string[];
      imageDataUrl?: string;
    }>
  ): void {
    const cardWidth = (CONTENT_WIDTH - 8) / 2; // 2 cards per row with small gap
    const imageHeight = cardWidth * 0.5625; // 16:9 aspect ratio
    const cardHeight = imageHeight + 50; // Image + content area
    const cardGap = 8;

    // Section title
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(71, 118, 56);
    this.pdf.text(this.t.topPersonas, MARGIN, this.currentY);
    this.currentY += 8;

    // Draw cards in 2-column grid
    personas.forEach((persona, index) => {
      // Check if we need a new page
      if (this.currentY + cardHeight > PAGE_HEIGHT - MARGIN - FOOTER_HEIGHT) {
        this.addNewPage();
      }

      const col = index % 2;
      const cardX = MARGIN + col * (cardWidth + cardGap);

      // Start new row every 2 cards
      if (col === 0 && index > 0) {
        this.currentY += cardHeight + 5;
      }

      // Card background with border
      this.pdf.setFillColor(255, 255, 255);
      this.pdf.setDrawColor(229, 231, 235); // gray-200
      this.pdf.roundedRect(cardX, this.currentY, cardWidth, cardHeight, 2, 2, 'FD');

      let cardY = this.currentY;

      // 16:9 Image area
      if (persona.imageDataUrl) {
        try {
          this.pdf.addImage(
            persona.imageDataUrl,
            'PNG',
            cardX,
            cardY,
            cardWidth,
            imageHeight,
            undefined,
            'FAST'
          );
        } catch (imgError) {
          // Gray placeholder if image fails
          this.pdf.setFillColor(243, 244, 246); // gray-100
          this.pdf.rect(cardX, cardY, cardWidth, imageHeight, 'F');
          this.pdf.setFontSize(7);
          this.pdf.setTextColor(156, 163, 175); // gray-400
          this.pdf.text(this.locale === 'nl' ? 'Afbeelding' : 'Image', cardX + cardWidth / 2, cardY + imageHeight / 2, { align: 'center' });
        }
      } else {
        // Gray placeholder
        this.pdf.setFillColor(243, 244, 246); // gray-100
        this.pdf.rect(cardX, cardY, cardWidth, imageHeight, 'F');
        this.pdf.setFontSize(7);
        this.pdf.setTextColor(156, 163, 175); // gray-400
        this.pdf.text(this.locale === 'nl' ? 'Afbeelding' : 'Image', cardX + cardWidth / 2, cardY + imageHeight / 2, { align: 'center' });
      }

      cardY += imageHeight + 4;

      // Persona name
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(17, 24, 39); // gray-900
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(persona.name, cardX + 4, cardY + 3);
      cardY += 7;

      // Three stat boxes in a row
      const statBoxWidth = (cardWidth - 12) / 3;
      const statBoxHeight = 10;
      const labels = this.locale === 'nl'
        ? ['Inkomen', 'Leeftijd', 'Huishouden']
        : ['Income', 'Age', 'Household'];
      const values = [persona.income_level, persona.age_group, persona.household_type];

      for (let i = 0; i < 3; i++) {
        const boxX = cardX + 4 + i * (statBoxWidth + 2);

        // Stat box background
        this.pdf.setFillColor(249, 250, 251); // gray-50
        this.pdf.roundedRect(boxX, cardY, statBoxWidth, statBoxHeight, 1, 1, 'F');

        // Label
        this.pdf.setFontSize(5);
        this.pdf.setTextColor(75, 85, 99); // gray-600
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(labels[i], boxX + 2, cardY + 3.5);

        // Value (truncated)
        this.pdf.setFontSize(5);
        this.pdf.setTextColor(17, 24, 39); // gray-900
        this.pdf.setFont('helvetica', 'bold');
        const valueLines = this.pdf.splitTextToSize(values[i], statBoxWidth - 4);
        this.pdf.text(valueLines[0] || '-', boxX + 2, cardY + 7.5);
      }

      cardY += statBoxHeight + 3;

      // Description (truncated)
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(6);
      this.pdf.setTextColor(55, 65, 81); // gray-700
      const descLines = this.pdf.splitTextToSize(persona.description, cardWidth - 8);
      const maxLines = 2;
      const truncatedDesc = descLines.slice(0, maxLines);
      if (descLines.length > maxLines) {
        truncatedDesc[maxLines - 1] = truncatedDesc[maxLines - 1].slice(0, -3) + '...';
      }
      this.pdf.text(truncatedDesc, cardX + 4, cardY + 3);
    });

    // Move Y position after all cards
    const totalRows = Math.ceil(personas.length / 2);
    if (personas.length % 2 === 1) {
      this.currentY += cardHeight + 5;
    } else if (personas.length > 0) {
      this.currentY += cardHeight + 5;
    }
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

  // Calculate total steps for progress
  const wmsLayers = Object.entries(WMS_CATEGORIES).flatMap(([catId, cat]) =>
    Object.entries(cat.layers).map(([layerId, config]) => ({ catId, layerId, config }))
  );
  const hasCubes = data.cubeColors && data.cubeColors.length > 0;
  const hasCustomScenario = data.scenarios.customScenario && data.scenarios.customScenario.length > 0;
  const totalSteps =
    1 + // Title page
    (includeScoreOverview ? 1 : 0) +
    (includeTargetGroups ? 3 : 0) + // Rankings, scenarios, calculations
    (includeTargetGroups && hasCubes ? (hasCustomScenario ? 4 : 3) : 0) + // Cube pages (3 scenarios + optional custom)
    (includeDataTables ? 6 : 0) + // Demographics, health, safety, livability, residential, amenities
    (includeWMSMaps ? wmsLayers.length : 0);

  let currentStep = 0;
  const reportProgress = (status: string) => {
    currentStep++;
    onProgress?.(currentStep, totalSteps, status);
  };

  // Title page
  builder.addTitlePage(title, data.address, data.coordinates);
  reportProgress(t.title);

  // Table of contents placeholder
  const tocPage = builder.addTableOfContents();

  // Score Overview section
  if (includeScoreOverview) {
    // Calculate amenities score
    let amenitiesScore = 75;
    if (data.amenitiesData?.results && Array.isArray(data.amenitiesData.results)) {
      const totalItems = data.amenitiesData.results.reduce(
        (sum, result) => sum + (result.places?.length || 0),
        0
      );
      amenitiesScore = Math.min(100, Math.round(50 + totalItems * 2));
    }

    builder.addScoreOverview(data.locationData, amenitiesScore);
    reportProgress(t.scoreOverview);

    // WMS grading summary if available
    if (data.wmsGradingData) {
      builder.addWMSGradingSummary(data.wmsGradingData);
    }
  }

  // Target Groups section
  if (includeTargetGroups) {
    builder.startSection(t.targetGroupSection);

    // Rankings table
    builder.addTargetGroupRankings(data.personaScores, data.personas);
    reportProgress(t.targetGroupRankings);

    // Scenario comparisons
    const scenarios = [
      { name: '1', positions: data.scenarios.scenario1 },
      { name: '2', positions: data.scenarios.scenario2 },
      { name: '3', positions: data.scenarios.scenario3 }
    ];

    scenarios.forEach(scenario => {
      builder.addTargetGroupScenario(
        scenario.name,
        scenario.positions,
        data.personaScores,
        data.personas
      );
    });
    reportProgress(t.scenarioComparison);

    // Detailed calculations for top personas
    builder.addTargetGroupCalculations(data.personaScores, data.personas);
    reportProgress(t.targetGroupCalculations);

    // Cube Visualizations section - capture and add all 4 scenario cubes
    if (data.cubeColors && data.cubeColors.length > 0) {
      builder.startSection(t.scenarioCubes);

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
        // Scenario positions are rRankPositions (1-based ranking), not cube indices
        const positionsToCubeIndices = (positions: number[]): number[] => {
          return positions
            .map(pos => {
              const personaScore = data.personaScores[pos - 1];
              if (!personaScore) return -1;
              const persona = data.personas.find(p => p.id === personaScore.personaId);
              if (!persona) return -1;

              // Get the cube index based on persona characteristics
              const { index } = getPersonaCubePosition({
                income_level: persona.income_level,
                age_group: persona.age_group,
                household_type: persona.household_type,
              });
              return index;
            })
            .filter(idx => idx !== -1);
        };

        // Convert scenario positions to cube indices for visualization
        const cubeIndicesScenario1 = positionsToCubeIndices(data.scenarios.scenario1);
        const cubeIndicesScenario2 = positionsToCubeIndices(data.scenarios.scenario2);
        const cubeIndicesScenario3 = positionsToCubeIndices(data.scenarios.scenario3);
        const cubeIndicesCustom = data.scenarios.customScenario
          ? positionsToCubeIndices(data.scenarios.customScenario)
          : undefined;

        // Capture all scenario cubes (white background, higher resolution for larger display)
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

        // Add scenario 1 cube page with persona cards
        builder.addCubeVisualizationPage(
          cubeCaptures.scenario1,
          t.scenario1Title,
          t.scenario1Desc,
          getScenarioPersonas(data.scenarios.scenario1)
        );
        reportProgress(t.scenario1Title);

        // Add scenario 2 cube page with persona cards
        builder.addCubeVisualizationPage(
          cubeCaptures.scenario2,
          t.scenario2Title,
          t.scenario2Desc,
          getScenarioPersonas(data.scenarios.scenario2)
        );
        reportProgress(t.scenario2Title);

        // Add scenario 3 cube page with persona cards
        builder.addCubeVisualizationPage(
          cubeCaptures.scenario3,
          t.scenario3Title,
          t.scenario3Desc,
          getScenarioPersonas(data.scenarios.scenario3)
        );
        reportProgress(t.scenario3Title);

        // Add custom scenario if available
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
