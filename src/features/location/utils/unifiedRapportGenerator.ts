/**
 * Unified Rapport Generator
 *
 * Consolidates all export functionality into a single comprehensive PDF report.
 *
 * Structure:
 * 1. Title Page - Project title, address, date with voronoi cover
 * 2. Index - Table of contents
 * 3. Introduction - Location summary, SWOT analysis
 * 4. Doelgroep Scenario Overview - All 4 scenarios at a glance
 * 5. PVE Section - Program van Eisen with graph
 * 6-9. Scenario Pages (1-4) - Cube, intro, personas, detailed PVE
 * 10. Appendix - Score tables, data tables, map analysis
 */

import jsPDF from 'jspdf';
import { generateVoronoiCoverImage, DEFAULT_PVE_PERCENTAGES } from './voronoiSvgGenerator';
import type { PVEAllocations } from '../data/cache/pveConfigCache';

// ============================================================================
// TYPES
// ============================================================================

export interface LLMBuildingProgram {
  location_summary: string;
  pve_overview: {
    total_m2: number;
    breakdown: string;
  };
  generalized_pve?: {
    communal_categories: Record<string, unknown>;
    public_categories: Record<string, unknown>;
  };
  scenarios: LLMScenario[];
  comparative_analysis: string;
  // Additional fields we might need from LLM
  project_title?: string;
  swot_analysis?: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  scenarios_overview?: string;
}

export interface LLMScenario {
  scenario_name: string;
  scenario_simple_name: string;
  target_personas: string[];
  summary: string;
  residential: {
    total_m2: number;
    total_units: number;
    unit_mix: UnitMixItem[];
    demographics_considerations: string;
  };
  commercial: {
    total_m2: number;
    spaces: CommercialSpace[];
    local_amenities_analysis: string;
  };
  hospitality: {
    total_m2: number;
    concept: string;
  };
  social: {
    total_m2: number;
    facilities: SocialFacility[];
  };
  communal: {
    total_m2: number;
    amenities: CommunalAmenity[];
    persona_needs_analysis: string;
  };
  offices: {
    total_m2: number;
    concept: string;
  };
  key_insights: string[];
}

export interface UnitMixItem {
  typology_id: string;
  typology_name: string;
  quantity: number;
  total_m2: number;
  rationale: string;
}

export interface CommercialSpace {
  type: string;
  size_m2: number;
  rationale: string;
}

export interface SocialFacility {
  type: string;
  size_m2: number;
  rationale: string;
}

export interface CommunalAmenity {
  amenity_id: string;
  amenity_name: string;
  size_m2: number;
  rationale: string;
}

export interface CompactExportData {
  metadata: {
    location: string;
    exportDate: string;
    coordinates: { lat: number; lon: number };
  };
  pve: {
    description: string;
    totalM2: number;
    percentages: Record<string, { percentage: number; m2: number; description: string }>;
    timestamp: string;
  };
  allPersonas: PersonaBasic[];
  demographics: DemographicsData;
  health: HealthData;
  safety: SafetyData;
  livability: LivabilityData;
  amenities: AmenitiesData;
  housingMarket: HousingMarketData;
  targetGroups: TargetGroupsData;
}

export interface PersonaBasic {
  id: string;
  name: string;
  incomeLevel: string;
  householdType: string;
  ageGroup: string;
  description: string;
  imageUrl?: string;
  imageDataUrl?: string;
  current_property_types?: string[];
  desired_property_types?: string[];
}

export interface RankedPersona extends PersonaBasic {
  rank: number;
  score: number;
  categoryScores: {
    voorzieningen: number;
    leefbaarheid: number;
    woningvooraad: number;
    demografie: number;
  };
}

export interface DemographicsData {
  description: string;
  age: DataPoint[];
  status: DataPoint[];
  immigration: DataPoint[];
  familySize: SingleDataPoint;
  familyType: DataPoint[];
  income: SingleDataPoint;
}

export interface HealthData {
  description: string;
  experiencedHealth: SingleDataPoint;
  sports: SingleDataPoint;
  weight: DataPoint[];
  smoker: SingleDataPoint;
  alcohol: DataPoint[];
  limitedHealth: SingleDataPoint;
  loneliness: DataPoint[];
  emotionalSupport: SingleDataPoint;
  psychologicalHealth: DataPoint[];
}

export interface SafetyData {
  description: string;
  totalCrimes: SingleDataPoint;
  burglary: SingleDataPoint;
  pickpocketing: SingleDataPoint;
  accidents: SingleDataPoint;
  feelsUnsafe: SingleDataPoint;
  streetLighting: SingleDataPoint;
}

export interface LivabilityData {
  description: string;
  maintenance: DataPoint[];
  streetLighting: SingleDataPoint;
  youthFacilities: DataPoint[];
  contact: DataPoint[];
  volunteers: SingleDataPoint;
  socialCohesion: SingleDataPoint;
  livabilityScore: SingleDataPoint;
}

export interface AmenitiesData {
  description: string;
  items: AmenityItem[];
}

export interface AmenityItem {
  name: string;
  description: string;
  count: number;
  countScore: number;
  proximityCount: number;
  proximityBonus: number;
  closestDistance: number;
  averageDistance: number;
}

export interface HousingMarketData {
  description: string;
  avgPrice: number;
  avgSize: number;
  avgBuildYear: number;
  typeDistribution: { type: string; percentage: number }[];
  priceDistribution: { range: string; percentage: number }[];
}

export interface TargetGroupsData {
  description: string;
  rankedPersonas: RankedPersona[];
  recommendedScenarios: {
    name: string;
    personaNames: string[];
    avgScore: number;
  }[];
}

export interface DataPoint {
  name: string;
  description: string;
  neighborhood: string;
  municipality: string;
  national: string;
}

export interface SingleDataPoint {
  description: string;
  neighborhood: string;
  municipality: string;
  national: string;
}

export interface CubeCaptureResult {
  dataUrl: string;
  width: number;
  height: number;
}

export interface MapCaptureResult {
  name: string;
  dataUrl: string;
}

export interface UnifiedRapportConfig {
  locale: 'nl' | 'en';
  includeMapAnalysis: boolean;
  includeCubeVisualizations: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_HEIGHT = PAGE_HEIGHT - MARGIN * 2;

// Colors
const PRIMARY_COLOR: [number, number, number] = [71, 118, 56]; // #477638
const SECONDARY_COLOR: [number, number, number] = [134, 166, 125]; // #86a67d
const TEXT_COLOR: [number, number, number] = [30, 30, 30];
const MUTED_COLOR: [number, number, number] = [100, 100, 100];
const LIGHT_BG: [number, number, number] = [249, 250, 251];
const WHITE: [number, number, number] = [255, 255, 255];
const BORDER_COLOR: [number, number, number] = [229, 231, 235];

// ============================================================================
// TRANSLATIONS
// ============================================================================

const TRANSLATIONS = {
  nl: {
    projectReport: 'Project Rapport',
    generatedOn: 'Gegenereerd op',
    tableOfContents: 'Inhoudsopgave',
    introduction: 'Introductie',
    locationAnalysis: 'Locatie Analyse',
    swotAnalysis: 'SWOT Analyse',
    strengths: 'Sterktes',
    weaknesses: 'Zwaktes',
    opportunities: 'Kansen',
    threats: 'Bedreigingen',
    targetGroupOverview: 'Doelgroep Scenario Overzicht',
    programVanEisen: 'Programma van Eisen',
    scenario: 'Scenario',
    targetGroups: 'Doelgroepen',
    residentialProgram: 'Woningprogramma',
    unitMix: 'Woningtypologie Mix',
    commercialProgram: 'Commercieel Programma',
    hospitalityProgram: 'Horeca',
    socialProgram: 'Sociale Voorzieningen',
    communalProgram: 'Gemeenschappelijke Voorzieningen',
    officeProgram: 'Kantoren',
    keyInsights: 'Belangrijkste Inzichten',
    appendix: 'Bijlagen',
    totalScoreTable: 'Totale Score Tabel',
    detailedScoreTable: 'Gedetailleerde Score Tabel',
    environmentalScores: 'Omgevingsdata Scores',
    demographicsTable: 'Data Tabel Demografie',
    housingTable: 'Data Tabel Woningmarkt',
    safetyTable: 'Data Tabel Veiligheid',
    healthTable: 'Data Tabel Gezondheid',
    livabilityTable: 'Data Tabel Leefbaarheid',
    amenitiesTable: 'Data Tabel Voorzieningen',
    mapAnalysis: 'Kaartlagen Analyse',
    rank: 'Rang',
    persona: 'Persona',
    score: 'Score',
    income: 'Inkomen',
    age: 'Leeftijd',
    household: 'Huishouden',
    neighborhood: 'Buurt',
    municipality: 'Gemeente',
    national: 'Landelijk',
    quantity: 'Aantal',
    totalM2: 'Totaal m²',
    type: 'Type',
    size: 'Grootte',
    rationale: 'Onderbouwing',
    apartments: 'Woningen',
    commercial: 'Commercieel',
    hospitality: 'Horeca',
    social: 'Sociaal',
    communal: 'Gemeenschappelijk',
    offices: 'Kantoren',
    page: 'Pagina',
  },
  en: {
    projectReport: 'Project Report',
    generatedOn: 'Generated on',
    tableOfContents: 'Table of Contents',
    introduction: 'Introduction',
    locationAnalysis: 'Location Analysis',
    swotAnalysis: 'SWOT Analysis',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    opportunities: 'Opportunities',
    threats: 'Threats',
    targetGroupOverview: 'Target Group Scenario Overview',
    programVanEisen: 'Program of Requirements',
    scenario: 'Scenario',
    targetGroups: 'Target Groups',
    residentialProgram: 'Residential Program',
    unitMix: 'Unit Mix',
    commercialProgram: 'Commercial Program',
    hospitalityProgram: 'Hospitality',
    socialProgram: 'Social Facilities',
    communalProgram: 'Communal Facilities',
    officeProgram: 'Offices',
    keyInsights: 'Key Insights',
    appendix: 'Appendix',
    totalScoreTable: 'Total Score Table',
    detailedScoreTable: 'Detailed Score Table',
    environmentalScores: 'Environmental Data Scores',
    demographicsTable: 'Demographics Data Table',
    housingTable: 'Housing Market Data Table',
    safetyTable: 'Safety Data Table',
    healthTable: 'Health Data Table',
    livabilityTable: 'Livability Data Table',
    amenitiesTable: 'Amenities Data Table',
    mapAnalysis: 'Map Layers Analysis',
    rank: 'Rank',
    persona: 'Persona',
    score: 'Score',
    income: 'Income',
    age: 'Age',
    household: 'Household',
    neighborhood: 'Neighborhood',
    municipality: 'Municipality',
    national: 'National',
    quantity: 'Quantity',
    totalM2: 'Total m²',
    type: 'Type',
    size: 'Size',
    rationale: 'Rationale',
    apartments: 'Apartments',
    commercial: 'Commercial',
    hospitality: 'Hospitality',
    social: 'Social',
    communal: 'Communal',
    offices: 'Offices',
    page: 'Page',
  },
};

// ============================================================================
// UNIFIED RAPPORT BUILDER CLASS
// ============================================================================

export class UnifiedRapportBuilder {
  private pdf: jsPDF;
  private currentY: number = MARGIN;
  private currentPage: number = 1;
  private locale: 'nl' | 'en';
  private t: typeof TRANSLATIONS['nl'];
  private tocEntries: { title: string; page: number; level: number }[] = [];

  constructor(locale: 'nl' | 'en' = 'nl') {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.locale = locale;
    this.t = TRANSLATIONS[locale];
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private setColor(color: [number, number, number], type: 'fill' | 'text' | 'draw' = 'text'): void {
    if (type === 'fill') {
      this.pdf.setFillColor(...color);
    } else if (type === 'draw') {
      this.pdf.setDrawColor(...color);
    } else {
      this.pdf.setTextColor(...color);
    }
  }

  private addNewPage(): void {
    this.pdf.addPage();
    this.currentPage++;
    this.currentY = MARGIN;
  }

  private checkPageBreak(neededHeight: number): void {
    if (this.currentY + neededHeight > PAGE_HEIGHT - MARGIN) {
      this.addNewPage();
    }
  }

  private wrapText(text: string, maxWidth: number): string[] {
    return this.pdf.splitTextToSize(text, maxWidth);
  }

  private addPageFooter(): void {
    this.pdf.setFontSize(8);
    this.setColor(MUTED_COLOR);
    this.pdf.setFont('helvetica', 'normal');
    const pageText = `${this.t.page} ${this.currentPage}`;
    this.pdf.text(pageText, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
  }

  private addTocEntry(title: string, level: number = 0): void {
    this.tocEntries.push({ title, page: this.currentPage, level });
  }

  /**
   * Draw a pie/donut chart
   * @param centerX - X position of chart center
   * @param centerY - Y position of chart center
   * @param radius - Outer radius of the chart
   * @param segments - Array of { value, color, label } for each segment
   * @param innerRadius - Inner radius for donut chart (0 for full pie)
   */
  private drawPieChart(
    centerX: number,
    centerY: number,
    radius: number,
    segments: { value: number; color: [number, number, number]; label?: string }[],
    innerRadius: number = 0
  ): void {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) return;

    let currentAngle = -Math.PI / 2; // Start at top (12 o'clock)

    segments.forEach((segment) => {
      if (segment.value === 0) return;

      const segmentAngle = (segment.value / total) * 2 * Math.PI;
      const endAngle = currentAngle + segmentAngle;

      // Draw segment as a filled path
      this.setColor(segment.color, 'fill');

      // Create arc path
      const points: string[] = [];
      const steps = Math.max(20, Math.ceil(segmentAngle * 20));

      // Outer arc
      for (let i = 0; i <= steps; i++) {
        const angle = currentAngle + (segmentAngle * i) / steps;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
      }

      // Inner arc (reverse direction for donut)
      if (innerRadius > 0) {
        for (let i = steps; i >= 0; i--) {
          const angle = currentAngle + (segmentAngle * i) / steps;
          const x = centerX + Math.cos(angle) * innerRadius;
          const y = centerY + Math.sin(angle) * innerRadius;
          points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
        }
      } else {
        // For full pie, connect to center
        points.push(`${centerX.toFixed(2)} ${centerY.toFixed(2)}`);
      }

      // Draw filled polygon approximation of arc
      this.drawFilledArc(centerX, centerY, radius, innerRadius, currentAngle, endAngle, segment.color);

      // Add label if provided
      if (segment.label) {
        const midAngle = currentAngle + segmentAngle / 2;
        const labelRadius = innerRadius > 0 ? (radius + innerRadius) / 2 : radius * 0.6;
        const labelX = centerX + Math.cos(midAngle) * labelRadius;
        const labelY = centerY + Math.sin(midAngle) * labelRadius;

        this.pdf.setFontSize(6);
        this.setColor(TEXT_COLOR);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(segment.label, labelX, labelY, { align: 'center' });
      }

      currentAngle = endAngle;
    });

    // Clean outer edge with subtle border
    this.setColor([230, 230, 230], 'draw');
    this.pdf.setLineWidth(0.3);
    this.pdf.circle(centerX, centerY, radius, 'D');
    if (innerRadius > 0) {
      this.pdf.circle(centerX, centerY, innerRadius, 'D');
    }
  }

  /**
   * Draw a filled arc segment using small triangles
   */
  private drawFilledArc(
    centerX: number,
    centerY: number,
    outerRadius: number,
    innerRadius: number,
    startAngle: number,
    endAngle: number,
    color: [number, number, number]
  ): void {
    // Set fill color and disable stroke to prevent visible lines between triangles
    this.setColor(color, 'fill');
    this.setColor(color, 'draw'); // Set stroke to same color to hide edges
    this.pdf.setLineWidth(0);

    const steps = Math.max(20, Math.ceil((endAngle - startAngle) * 20));
    const angleStep = (endAngle - startAngle) / steps;

    for (let i = 0; i < steps; i++) {
      const a1 = startAngle + i * angleStep;
      const a2 = startAngle + (i + 1) * angleStep;

      // Outer points
      const x1 = centerX + Math.cos(a1) * outerRadius;
      const y1 = centerY + Math.sin(a1) * outerRadius;
      const x2 = centerX + Math.cos(a2) * outerRadius;
      const y2 = centerY + Math.sin(a2) * outerRadius;

      if (innerRadius > 0) {
        // Inner points for donut
        const x3 = centerX + Math.cos(a2) * innerRadius;
        const y3 = centerY + Math.sin(a2) * innerRadius;
        const x4 = centerX + Math.cos(a1) * innerRadius;
        const y4 = centerY + Math.sin(a1) * innerRadius;

        // Draw quadrilateral as two triangles (fill only, no stroke)
        this.pdf.triangle(x1, y1, x2, y2, x3, y3, 'F');
        this.pdf.triangle(x1, y1, x3, y3, x4, y4, 'F');
      } else {
        // Triangle to center for full pie
        this.pdf.triangle(centerX, centerY, x1, y1, x2, y2, 'F');
      }
    }
  }

  // ==========================================================================
  // PAGE 1: TITLE PAGE
  // ==========================================================================

  addTitlePage(
    projectTitle: string,
    address: string,
    generationDate: string,
    voronoiImage?: string  // PNG data URL
  ): void {
    // Layout dimensions (in mm)
    const imageLeft = 10;      // 1cm from left
    const imageTop = 10;       // 1cm from top
    const imageRight = 10;     // 1cm from right
    const imageBottom = 30;    // 3cm from bottom
    const imageWidth = PAGE_WIDTH - imageLeft - imageRight;  // 190mm
    const imageHeight = PAGE_HEIGHT - imageTop - imageBottom; // 257mm

    // Add voronoi cover image if provided
    if (voronoiImage) {
      try {
        this.pdf.addImage(
          voronoiImage,
          'PNG',
          imageLeft,
          imageTop,
          imageWidth,
          imageHeight
        );
      } catch (e) {
        console.warn('Failed to add voronoi cover image:', e);
        // Fallback: draw a gradient rectangle
        this.setColor(SECONDARY_COLOR, 'fill');
        this.pdf.rect(imageLeft, imageTop, imageWidth, imageHeight, 'F');
      }
    } else {
      // Fallback: draw a solid color rectangle
      this.setColor(SECONDARY_COLOR, 'fill');
      this.pdf.rect(imageLeft, imageTop, imageWidth, imageHeight, 'F');
    }

    // Project title - positioned at bottom of graphic, 10mm from the bottom edge of the image
    // Title is in white, within the graphic
    const titleBottomOffset = 10; // 1cm from bottom of graphic
    const titleY = imageTop + imageHeight - titleBottomOffset;

    this.pdf.setFontSize(32);
    this.pdf.setTextColor(255, 255, 255); // White text
    this.pdf.setFont('helvetica', 'bold');

    // Wrap title to fit within image width with padding
    const titleMaxWidth = imageWidth - 20; // 10mm padding on each side
    const titleLines = this.wrapText(projectTitle, titleMaxWidth);

    // Position title from bottom up (so multi-line titles grow upward)
    const lineHeight = 14;
    const totalTitleHeight = titleLines.length * lineHeight;
    const titleStartY = titleY - totalTitleHeight + lineHeight;

    titleLines.forEach((line, i) => {
      this.pdf.text(line, PAGE_WIDTH / 2, titleStartY + i * lineHeight, { align: 'center' });
    });

    // Below the graphic: subtitle (left) and date (right)
    const belowGraphicY = imageTop + imageHeight + 8; // 8mm below graphic

    // Subtitle (address) - left aligned
    this.pdf.setFontSize(11);
    this.setColor(TEXT_COLOR);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(address, imageLeft, belowGraphicY);

    // Date - right aligned (without "Gegenereerd op:")
    this.pdf.text(generationDate, PAGE_WIDTH - imageRight, belowGraphicY, { align: 'right' });

    // Footer: GROOSMAN centered at bottom
    const footerY = PAGE_HEIGHT - 5; // 5mm from bottom (moved 1cm down)
    this.pdf.setFontSize(12);
    this.pdf.setFont('helvetica', 'bold');
    this.setColor(TEXT_COLOR);
    this.pdf.text('GROOSMAN', PAGE_WIDTH / 2, footerY, { align: 'center' });
  }

  // ==========================================================================
  // PAGE 2: TABLE OF CONTENTS
  // ==========================================================================

  addTableOfContents(): void {
    this.addNewPage();

    // Title
    this.pdf.setFontSize(20);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.tableOfContents, MARGIN, this.currentY);
    this.currentY += 15;

    // Decorative line
    this.setColor(PRIMARY_COLOR, 'draw');
    this.pdf.setLineWidth(0.5);
    this.pdf.line(MARGIN, this.currentY, MARGIN + 40, this.currentY);
    this.currentY += 10;

    // TOC entries will be filled in by updateTableOfContents() after all pages are generated
  }

  // Method to update TOC after all pages are added
  updateTableOfContents(): void {
    // Go to page 2 (TOC page)
    this.pdf.setPage(2);

    let tocY = MARGIN + 25;

    // Clear previous TOC content area
    this.setColor(WHITE, 'fill');
    this.pdf.rect(MARGIN, tocY, CONTENT_WIDTH, PAGE_HEIGHT - tocY - MARGIN, 'F');

    this.tocEntries.forEach((entry) => {
      if (tocY > PAGE_HEIGHT - MARGIN - 10) return; // Stop if out of space

      const indent = entry.level * 10;
      const fontSize = entry.level === 0 ? 11 : 10;
      const fontStyle = entry.level === 0 ? 'bold' : 'normal';

      this.pdf.setFontSize(fontSize);
      this.setColor(entry.level === 0 ? TEXT_COLOR : MUTED_COLOR);
      this.pdf.setFont('helvetica', fontStyle);

      // Title
      const titleText = this.wrapText(entry.title, CONTENT_WIDTH - indent - 20)[0];
      this.pdf.text(titleText, MARGIN + indent, tocY);

      // Page number (right aligned)
      this.pdf.text(entry.page.toString(), PAGE_WIDTH - MARGIN, tocY, { align: 'right' });

      // Dotted line between title and page number
      this.setColor(BORDER_COLOR, 'draw');
      this.pdf.setLineDashPattern([1, 1], 0);
      const titleWidth = this.pdf.getTextWidth(titleText);
      const pageNumWidth = this.pdf.getTextWidth(entry.page.toString());
      this.pdf.line(
        MARGIN + indent + titleWidth + 5,
        tocY - 1,
        PAGE_WIDTH - MARGIN - pageNumWidth - 5,
        tocY - 1
      );
      this.pdf.setLineDashPattern([], 0);

      tocY += entry.level === 0 ? 8 : 6;
    });
  }

  // ==========================================================================
  // PAGES 3-4: INTRODUCTION & SWOT
  // ==========================================================================

  addIntroductionSection(
    locationSummary: string,
    swotAnalysis?: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    }
  ): void {
    this.addNewPage();
    this.addTocEntry(this.t.introduction, 0);

    // Section title
    this.pdf.setFontSize(18);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.introduction, MARGIN, this.currentY);
    this.currentY += 12;

    // Location Analysis subtitle
    this.pdf.setFontSize(14);
    this.setColor(TEXT_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.locationAnalysis, MARGIN, this.currentY);
    this.currentY += 8;

    // Location summary
    this.pdf.setFontSize(10);
    this.setColor(TEXT_COLOR);
    this.pdf.setFont('helvetica', 'normal');
    const summaryLines = this.wrapText(locationSummary, CONTENT_WIDTH);
    summaryLines.forEach((line) => {
      this.checkPageBreak(6);
      this.pdf.text(line, MARGIN, this.currentY);
      this.currentY += 5;
    });

    // SWOT Analysis - Simple 2x2 grid with SWOT letters in center
    if (swotAnalysis) {
      this.currentY += 10;
      this.addTocEntry(this.t.swotAnalysis, 1);

      // SWOT subtitle
      this.pdf.setFontSize(14);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(this.t.swotAnalysis, MARGIN, this.currentY);
      this.currentY += 10;

      // Grid dimensions
      const gridWidth = CONTENT_WIDTH;
      const gridHeight = 100;
      const boxWidth = gridWidth / 2;
      const boxHeight = gridHeight / 2;
      const gridX = MARGIN;
      const gridY = this.currentY;

      // Center position for SWOT letters
      const centerX = gridX + gridWidth / 2;
      const centerY = gridY + gridHeight / 2;

      // SWOT quadrants data
      const quadrants = [
        { letter: 'S', items: swotAnalysis.strengths, col: 0, row: 0 },
        { letter: 'W', items: swotAnalysis.weaknesses, col: 1, row: 0 },
        { letter: 'O', items: swotAnalysis.opportunities, col: 0, row: 1 },
        { letter: 'T', items: swotAnalysis.threats, col: 1, row: 1 },
      ];

      // Draw quadrant boxes and content
      quadrants.forEach((q) => {
        const boxX = gridX + q.col * boxWidth;
        const boxY = gridY + q.row * boxHeight;

        // Light background
        this.setColor(LIGHT_BG, 'fill');
        this.setColor(BORDER_COLOR, 'draw');
        this.pdf.setLineWidth(0.3);
        this.pdf.rect(boxX, boxY, boxWidth, boxHeight, 'FD');

        // Items with text wrapping
        this.pdf.setFontSize(8);
        this.setColor(TEXT_COLOR);
        this.pdf.setFont('helvetica', 'normal');

        // Bottom row (O, T) starts lower to avoid SWOT letters
        let itemY = q.row === 0 ? boxY + 5 : boxY + 12;
        const itemWidth = boxWidth - 8;
        const lineHeight = 3.5;

        q.items.slice(0, 5).forEach((text) => {
          const wrappedLines = this.wrapText(`• ${text}`, itemWidth);
          wrappedLines.slice(0, 2).forEach((line) => {
            if (itemY < boxY + boxHeight - 3) {
              this.pdf.text(line, boxX + 4, itemY);
              itemY += lineHeight;
            }
          });
          itemY += 0.5;
        });
      });

      // SWOT letters in green at the center intersection
      this.pdf.setFontSize(14);
      this.setColor(PRIMARY_COLOR);
      this.pdf.setFont('helvetica', 'bold');
      // Position each letter in its respective quadrant corner near center
      this.pdf.text('S', centerX - 8, centerY - 2);
      this.pdf.text('W', centerX + 3, centerY - 2);
      this.pdf.text('O', centerX - 8, centerY + 7);
      this.pdf.text('T', centerX + 3, centerY + 7);

      this.currentY = gridY + gridHeight + 5;
    }
  }

  // ==========================================================================
  // PAGE 5: DOELGROEP SCENARIO OVERVIEW
  // ==========================================================================

  addScenarioOverview(
    overviewText: string,
    scenarios: { name: string; simpleName: string; personas: string[] }[]
  ): void {
    this.addNewPage();
    this.addTocEntry(this.t.targetGroupOverview, 0);

    // Section title
    this.pdf.setFontSize(18);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.targetGroupOverview, MARGIN, this.currentY);
    this.currentY += 12;

    // Overview text
    this.pdf.setFontSize(10);
    this.setColor(TEXT_COLOR);
    this.pdf.setFont('helvetica', 'normal');
    const overviewLines = this.wrapText(overviewText, CONTENT_WIDTH);
    overviewLines.forEach((line) => {
      this.pdf.text(line, MARGIN, this.currentY);
      this.currentY += 5;
    });
    this.currentY += 10;

    // Scenario cards (2x2 grid) with table layout
    const cardWidth = (CONTENT_WIDTH - 6) / 2;
    const headerHeight = 10;
    const cellHeight = 8;
    const cardGap = 6;

    // Calculate max personas per row for consistent heights within each row
    const scenarioList = scenarios.slice(0, 4);
    const row0Scenarios = scenarioList.filter((_, i) => Math.floor(i / 2) === 0);
    const row1Scenarios = scenarioList.filter((_, i) => Math.floor(i / 2) === 1);
    const maxPersonasRow0 = Math.max(...row0Scenarios.map(s => Math.min(s.personas.length, 5)), 1);
    const maxPersonasRow1 = row1Scenarios.length > 0
      ? Math.max(...row1Scenarios.map(s => Math.min(s.personas.length, 5)), 1)
      : 0;
    const row0Height = headerHeight + maxPersonasRow0 * cellHeight;
    const row1Height = headerHeight + maxPersonasRow1 * cellHeight;

    scenarioList.forEach((scenario, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cardX = MARGIN + col * (cardWidth + cardGap);
      const rowHeight = row === 0 ? row0Height : row1Height;
      const cardY = this.currentY + (row === 0 ? 0 : row0Height + cardGap);

      // Header background
      this.setColor(PRIMARY_COLOR, 'fill');
      this.pdf.roundedRect(cardX, cardY, cardWidth, headerHeight, 2, 2, 'F');
      this.pdf.rect(cardX, cardY + headerHeight - 2, cardWidth, 2, 'F'); // Square off bottom corners

      // Header text
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(255, 255, 255);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(`${scenario.name}: ${scenario.simpleName}`, cardX + 4, cardY + 7);

      // Table cells for personas (fill all rows to match row height)
      this.pdf.setFontSize(9);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');

      const maxRows = row === 0 ? maxPersonasRow0 : maxPersonasRow1;
      for (let pIdx = 0; pIdx < maxRows; pIdx++) {
        const cellY = cardY + headerHeight + pIdx * cellHeight;
        const persona = scenario.personas[pIdx];

        // Cell background (all white)
        this.setColor(WHITE, 'fill');
        this.pdf.rect(cardX, cellY, cardWidth, cellHeight, 'F');

        // Cell border (grey outline)
        this.setColor(BORDER_COLOR, 'draw');
        this.pdf.setLineWidth(0.2);
        this.pdf.rect(cardX, cellY, cardWidth, cellHeight, 'D');

        // Persona name (only if persona exists)
        if (persona) {
          this.setColor(TEXT_COLOR);
          this.pdf.text(persona, cardX + 4, cellY + 5.5);
        }
      }

      // Outer border for the table
      this.setColor(BORDER_COLOR, 'draw');
      this.pdf.setLineWidth(0.3);
      this.pdf.roundedRect(cardX, cardY, cardWidth, rowHeight, 2, 2, 'D');
    });

    // Update currentY position
    this.currentY += row0Height + (row1Scenarios.length > 0 ? cardGap + row1Height : 0) + 10;
  }

  // ==========================================================================
  // PAGE 6: PVE SECTION
  // ==========================================================================

  addPVESection(
    pveData: {
      totalM2: number;
      percentages: Record<string, { percentage: number; m2: number; description: string }>;
    },
    pveGraphImage?: string  // Optional screenshot of PVE graph
  ): void {
    this.addNewPage();
    this.addTocEntry(this.t.programVanEisen, 0);

    // Section title
    this.pdf.setFontSize(18);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.programVanEisen, MARGIN, this.currentY);
    this.currentY += 12;

    const categories = Object.entries(pveData.percentages);
    const colors: [number, number, number][] = [
      [71, 118, 56],   // apartments - primary green
      [134, 166, 125], // commercial - secondary green
      [212, 175, 55],  // hospitality - gold
      [59, 130, 246],  // social - blue
      [147, 51, 234],  // communal - purple
      [100, 116, 139], // offices - slate
    ];

    // If we have a screenshot of the PVE graph, use it
    if (pveGraphImage) {
      try {
        const graphWidth = CONTENT_WIDTH;
        const graphHeight = 40; // Adjust based on actual aspect ratio
        this.pdf.addImage(pveGraphImage, 'PNG', MARGIN, this.currentY, graphWidth, graphHeight);
        this.currentY += graphHeight + 5;
      } catch (e) {
        console.warn('Failed to add PVE graph image:', e);
        // Fall back to drawing the chart
        this.drawPVEChart(categories, colors);
      }
    } else {
      // Draw stacked bar chart with labels on sections
      this.drawPVEChart(categories, colors);
    }

    // Total m² below the graph
    this.currentY += 5;
    this.pdf.setFontSize(12);
    this.setColor(TEXT_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(`${this.t.totalM2}: ${pveData.totalM2.toLocaleString()} m²`, MARGIN, this.currentY);
    this.currentY += 15;

    // Category breakdown table (below graph and total)
    const colWidths = [50, 25, 35, 60];
    const baseRowHeight = 8;

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, baseRowHeight, 'F');

    this.pdf.setFontSize(8);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');

    let headerX = MARGIN + 3;
    const headers = this.locale === 'nl'
      ? ['Categorie', '%', 'm²', 'Beschrijving']
      : ['Category', '%', 'm²', 'Description'];
    headers.forEach((header, i) => {
      this.pdf.text(header, headerX, this.currentY + 5.5);
      headerX += colWidths[i];
    });
    this.currentY += baseRowHeight;

    // Table rows with text wrapping
    this.pdf.setFont('helvetica', 'normal');
    categories.forEach(([key, value], index) => {
      // Calculate row height based on description text
      const descLines = this.wrapText(value.description, colWidths[3] - 6);
      const rowHeight = Math.max(baseRowHeight, descLines.length * 4 + 4);

      // Row background (white with border)
      this.setColor(WHITE, 'fill');
      this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');
      this.setColor(BORDER_COLOR, 'draw');
      this.pdf.setLineWidth(0.2);
      this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'D');

      this.pdf.setFontSize(8);
      this.setColor(TEXT_COLOR);

      let cellX = MARGIN + 3;
      const categoryName = this.t[key as keyof typeof this.t] || key;
      this.pdf.text(String(categoryName), cellX, this.currentY + 5);
      cellX += colWidths[0];

      this.pdf.text(`${value.percentage}%`, cellX, this.currentY + 5);
      cellX += colWidths[1];

      this.pdf.text(`${value.m2.toLocaleString()}`, cellX, this.currentY + 5);
      cellX += colWidths[2];

      // Description with text wrapping
      let descY = this.currentY + 5;
      descLines.forEach((line) => {
        this.pdf.text(line, cellX, descY);
        descY += 4;
      });

      this.currentY += rowHeight;
    });
  }

  // Helper method to draw PVE stacked bar chart
  private drawPVEChart(
    categories: [string, { percentage: number; m2: number; description: string }][],
    colors: [number, number, number][]
  ): void {
    const chartHeight = 30;
    const chartWidth = CONTENT_WIDTH;
    let chartX = MARGIN;

    // Draw stacked bar
    categories.forEach(([key, value], index) => {
      const barWidth = (value.percentage / 100) * chartWidth;
      this.setColor(colors[index % colors.length], 'fill');
      this.pdf.rect(chartX, this.currentY, barWidth, chartHeight, 'F');
      chartX += barWidth;
    });

    // Add labels on top of each section
    chartX = MARGIN;
    categories.forEach(([key, value], index) => {
      const barWidth = (value.percentage / 100) * chartWidth;
      const categoryName = this.t[key as keyof typeof this.t] || key;

      // Label above the bar section
      this.pdf.setFontSize(7);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'bold');

      if (barWidth > 15) {
        // Centered label with percentage
        const labelText = `${categoryName} (${value.percentage}%)`;
        const labelWidth = this.pdf.getTextWidth(labelText);
        const labelX = chartX + (barWidth - labelWidth) / 2;

        // Draw label above bar
        this.pdf.text(labelText, Math.max(labelX, chartX + 2), this.currentY - 2);
      }

      chartX += barWidth;
    });

    this.currentY += chartHeight;
  }

  // ==========================================================================
  // SCENARIO PAGES (6-9)
  // ==========================================================================

  addScenarioSection(
    scenarioIndex: number,
    scenario: LLMScenario,
    cubeCapture?: CubeCaptureResult,
    personas?: PersonaBasic[],
    pveData?: CompactExportData['pve']
  ): void {
    // Page 1: Cube + Overview
    this.addNewPage();
    const scenarioTitle = `${this.t.scenario} ${scenarioIndex}: ${scenario.scenario_simple_name}`;
    this.addTocEntry(scenarioTitle, 0);

    // Scenario header
    this.pdf.setFontSize(16);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(scenarioTitle, MARGIN, this.currentY);
    this.currentY += 10;

    // Two-column layout: Cube on left, info on right
    const leftColWidth = 85;
    const rightColWidth = CONTENT_WIDTH - leftColWidth - 10;
    const rightColX = MARGIN + leftColWidth + 10;

    // Cube visualization (left)
    if (cubeCapture) {
      const cubeSize = 80;
      try {
        this.pdf.addImage(
          cubeCapture.dataUrl, 'PNG',
          MARGIN, this.currentY,
          cubeSize, cubeSize,
          undefined, 'FAST'
        );
      } catch {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, cubeSize, cubeSize, 'F');
        this.pdf.setFontSize(8);
        this.setColor(MUTED_COLOR);
        this.pdf.text('Cube visualization', MARGIN + 10, this.currentY + cubeSize / 2);
      }
    }

    // Scenario info (right)
    let rightY = this.currentY;

    // Target personas header
    this.pdf.setFontSize(11);
    this.setColor(TEXT_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.targetGroups, rightColX, rightY);
    rightY += 6;

    // List target personas (no bullets)
    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    scenario.target_personas.forEach((persona) => {
      this.pdf.text(persona, rightColX, rightY);
      rightY += 5;
    });

    // Move past cube
    this.currentY += 85;

    // Summary
    this.pdf.setFontSize(10);
    this.setColor(TEXT_COLOR);
    this.pdf.setFont('helvetica', 'normal');
    const summaryLines = this.wrapText(scenario.summary, CONTENT_WIDTH);
    summaryLines.forEach((line) => {
      this.pdf.text(line, MARGIN, this.currentY);
      this.currentY += 5;
    });
    this.currentY += 8;

    // Key insights
    if (scenario.key_insights.length > 0) {
      this.pdf.setFontSize(11);
      this.setColor(PRIMARY_COLOR);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(this.t.keyInsights, MARGIN, this.currentY);
      this.currentY += 6;

      this.pdf.setFontSize(9);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');
      scenario.key_insights.slice(0, 5).forEach((insight) => {
        const insightLines = this.wrapText(`• ${insight}`, CONTENT_WIDTH);
        insightLines.forEach((line) => {
          this.checkPageBreak(5);
          this.pdf.text(line, MARGIN, this.currentY);
          this.currentY += 4;
        });
      });
    }

    // Target group details
    this.addTargetGroupDetails(scenario.target_personas, personas);

    // Page 2: Residential Program
    this.addResidentialProgramPage(scenarioIndex, scenario, pveData);

    // Page 3: Commercial, Hospitality, Social, Communal, Offices
    this.addNonResidentialProgramPage(scenarioIndex, scenario, pveData);
  }

  private addTargetGroupDetails(
    personaNames: string[],
    allPersonas?: PersonaBasic[]
  ): void {
    if (!allPersonas) return;

    this.checkPageBreak(60);
    this.currentY += 5;

    this.pdf.setFontSize(11);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.targetGroups, MARGIN, this.currentY);
    this.currentY += 8;

    // Find matching personas
    const matchingPersonas = personaNames
      .map(name => allPersonas.find(p => p.name === name))
      .filter((p): p is PersonaBasic => p !== undefined);

    // Housing type labels
    const currentHousingLabel = this.locale === 'nl' ? 'Huidig woningtype' : 'Current housing';
    const desiredHousingLabel = this.locale === 'nl' ? 'Gewenst woningtype' : 'Desired housing';

    // Display each persona with image and housing info
    // Use portrait aspect ratio (3:4 for images, taller than wide)
    const imageWidth = 20; // mm
    const imageHeight = 27; // mm (4:3 aspect ratio, portrait)
    const textStartX = MARGIN + imageWidth + 5;
    const textWidth = CONTENT_WIDTH - imageWidth - 5;

    matchingPersonas.forEach((persona) => {
      this.checkPageBreak(40);

      const personaStartY = this.currentY;

      // Persona image (left side) - clipped to fit frame
      if (persona.imageDataUrl) {
        try {
          // Create a clipping mask for the image area
          this.pdf.saveGraphicsState();
          // Draw rounded clip path
          this.pdf.roundedRect(MARGIN, this.currentY, imageWidth, imageHeight, 2, 2, 'S');
          // Add image with cover-style fitting (may be cropped)
          this.pdf.addImage(
            persona.imageDataUrl, 'PNG',
            MARGIN, this.currentY,
            imageWidth, imageHeight,
            undefined, 'FAST'
          );
          this.pdf.restoreGraphicsState();
          // Draw border around image
          this.setColor(BORDER_COLOR, 'draw');
          this.pdf.setLineWidth(0.3);
          this.pdf.roundedRect(MARGIN, this.currentY, imageWidth, imageHeight, 2, 2, 'D');
        } catch {
          // Fallback: draw placeholder
          this.setColor(LIGHT_BG, 'fill');
          this.pdf.roundedRect(MARGIN, this.currentY, imageWidth, imageHeight, 2, 2, 'F');
        }
      } else {
        // Placeholder if no image
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.roundedRect(MARGIN, this.currentY, imageWidth, imageHeight, 2, 2, 'F');
      }

      // Name (right of image)
      this.pdf.setFontSize(10);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(persona.name, textStartX, this.currentY + 4);

      // Stats line
      this.pdf.setFontSize(7);
      this.setColor(MUTED_COLOR);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(
        `${persona.incomeLevel} | ${persona.ageGroup} | ${persona.householdType}`,
        textStartX, this.currentY + 8
      );

      // Description
      this.pdf.setFontSize(7);
      this.setColor(TEXT_COLOR);
      const descLines = this.wrapText(persona.description, textWidth);
      let descY = this.currentY + 12;
      descLines.slice(0, 2).forEach((line) => {
        this.pdf.text(line, textStartX, descY);
        descY += 3.5;
      });

      // Current housing
      if (persona.current_property_types && persona.current_property_types.length > 0) {
        descY += 1;
        this.pdf.setFont('helvetica', 'bold');
        this.setColor(MUTED_COLOR);
        this.pdf.text(`${currentHousingLabel}: `, textStartX, descY);
        this.pdf.setFont('helvetica', 'normal');
        this.setColor(TEXT_COLOR);
        const housingText = persona.current_property_types.join(', ');
        const housingLines = this.wrapText(housingText, textWidth - 25);
        const labelWidth = this.pdf.getTextWidth(`${currentHousingLabel}: `);
        this.pdf.text(housingLines[0], textStartX + labelWidth, descY);
      }

      // Desired housing
      if (persona.desired_property_types && persona.desired_property_types.length > 0) {
        descY += 4;
        this.pdf.setFont('helvetica', 'bold');
        this.setColor(MUTED_COLOR);
        this.pdf.text(`${desiredHousingLabel}: `, textStartX, descY);
        this.pdf.setFont('helvetica', 'normal');
        this.setColor(TEXT_COLOR);
        const desiredText = persona.desired_property_types.join(', ');
        const desiredLines = this.wrapText(desiredText, textWidth - 25);
        const labelWidth = this.pdf.getTextWidth(`${desiredHousingLabel}: `);
        this.pdf.text(desiredLines[0], textStartX + labelWidth, descY);
      }

      // Move Y past the persona card (max of image height or text content)
      this.currentY = Math.max(personaStartY + imageHeight + 3, descY + 5);
    });
  }

  private addResidentialProgramPage(
    scenarioIndex: number,
    scenario: LLMScenario,
    pveData?: CompactExportData['pve']
  ): void {
    this.addNewPage();
    this.addTocEntry(`${this.t.scenario} ${scenarioIndex}: ${this.t.residentialProgram}`, 1);

    // Header
    this.pdf.setFontSize(14);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(`${this.t.residentialProgram} - ${scenario.scenario_simple_name}`, MARGIN, this.currentY);
    this.currentY += 10;

    // Pie chart showing PVE distribution
    if (pveData) {
      const chartCenterX = PAGE_WIDTH / 2;
      const chartRadius = 30;
      const chartCenterY = this.currentY + chartRadius + 5;

      // Green shades for residential unit types
      const greenShades: [number, number, number][] = [
        [71, 118, 56],   // PRIMARY_COLOR - darkest green
        [100, 150, 80],  // medium-dark green
        [130, 170, 100], // medium green
        [160, 190, 130], // medium-light green
        [190, 210, 160], // light green
        [210, 230, 180], // lightest green
      ];

      // Build pie chart segments - residential units as different greens
      const segments: { value: number; color: [number, number, number]; label?: string }[] = [];

      // Add residential unit types (different greens)
      scenario.residential.unit_mix.forEach((unit, idx) => {
        segments.push({
          value: unit.total_m2,
          color: greenShades[idx % greenShades.length],
          label: unit.typology_name.substring(0, 15),
        });
      });

      // Add other PVE categories as light grey
      const greyColor: [number, number, number] = [200, 200, 200];
      if (pveData.percentages?.commercial?.m2 && pveData.percentages.commercial.m2 > 0) {
        segments.push({ value: pveData.percentages.commercial.m2, color: greyColor });
      }
      if (pveData.percentages?.hospitality?.m2 && pveData.percentages.hospitality.m2 > 0) {
        segments.push({ value: pveData.percentages.hospitality.m2, color: greyColor });
      }
      if (pveData.percentages?.social?.m2 && pveData.percentages.social.m2 > 0) {
        segments.push({ value: pveData.percentages.social.m2, color: greyColor });
      }
      if (pveData.percentages?.communal?.m2 && pveData.percentages.communal.m2 > 0) {
        segments.push({ value: pveData.percentages.communal.m2, color: greyColor });
      }
      if (pveData.percentages?.offices?.m2 && pveData.percentages.offices.m2 > 0) {
        segments.push({ value: pveData.percentages.offices.m2, color: greyColor });
      }

      this.drawPieChart(chartCenterX, chartCenterY, chartRadius, segments, chartRadius * 0.4);

      // Total m² in center of donut
      this.pdf.setFontSize(8);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'bold');
      const totalText = `${(pveData.totalM2 || 0).toLocaleString()} m²`;
      this.pdf.text(totalText, chartCenterX, chartCenterY + 2, { align: 'center' });

      this.currentY = chartCenterY + chartRadius + 10;
    }

    // Summary stats
    this.pdf.setFontSize(10);
    this.setColor(TEXT_COLOR);
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text(
      `${this.t.totalM2}: ${scenario.residential.total_m2.toLocaleString()} m² | ${this.t.quantity}: ${scenario.residential.total_units} units`,
      MARGIN, this.currentY
    );
    this.currentY += 8;

    // Unit mix table
    this.pdf.setFontSize(11);
    this.setColor(TEXT_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.unitMix, MARGIN, this.currentY);
    this.currentY += 6;

    const colWidths = [50, 20, 25, 75];
    const rowHeight = 12;

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');

    this.pdf.setFontSize(8);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');

    let headerX = MARGIN + 2;
    [this.t.type, this.t.quantity, 'm²', this.t.rationale].forEach((header, i) => {
      this.pdf.text(header, headerX, this.currentY + 8);
      headerX += colWidths[i];
    });
    this.currentY += rowHeight;

    // Table rows
    this.pdf.setFont('helvetica', 'normal');
    scenario.residential.unit_mix.forEach((unit, index) => {
      this.checkPageBreak(rowHeight + 5);

      const isEven = index % 2 === 0;
      if (isEven) {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');
      }

      this.pdf.setFontSize(8);
      this.setColor(TEXT_COLOR);

      let cellX = MARGIN + 2;
      this.pdf.text(unit.typology_name, cellX, this.currentY + 8);
      cellX += colWidths[0];

      this.pdf.text(unit.quantity.toString(), cellX, this.currentY + 8);
      cellX += colWidths[1];

      this.pdf.text(unit.total_m2.toLocaleString(), cellX, this.currentY + 8);
      cellX += colWidths[2];

      const rationaleText = this.wrapText(unit.rationale, colWidths[3] - 4)[0];
      this.pdf.text(rationaleText, cellX, this.currentY + 8);

      this.currentY += rowHeight;
    });

    // Demographics considerations
    this.currentY += 10;
    this.checkPageBreak(30);

    this.pdf.setFontSize(10);
    this.setColor(TEXT_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text('Demografische Overwegingen', MARGIN, this.currentY);
    this.currentY += 6;

    this.pdf.setFontSize(9);
    this.pdf.setFont('helvetica', 'normal');
    const demoLines = this.wrapText(scenario.residential.demographics_considerations, CONTENT_WIDTH);
    demoLines.forEach((line) => {
      this.checkPageBreak(5);
      this.pdf.text(line, MARGIN, this.currentY);
      this.currentY += 4;
    });
  }

  private addNonResidentialProgramPage(
    scenarioIndex: number,
    scenario: LLMScenario,
    pveData?: CompactExportData['pve']
  ): void {
    this.addNewPage();
    this.addTocEntry(`${this.t.scenario} ${scenarioIndex}: ${this.t.commercialProgram}`, 1);

    // Pie chart showing non-residential PVE distribution
    if (pveData) {
      const chartCenterX = PAGE_WIDTH / 2;
      const chartRadius = 25;
      const chartCenterY = this.currentY + chartRadius + 5;

      // Green/earth tones for non-residential
      const categoryColors: { [key: string]: [number, number, number] } = {
        commercial: [119, 138, 94],    // sage green
        hospitality: [71, 105, 56],    // forest green
        social: [99, 131, 81],         // olive
        communal: [138, 151, 107],     // light sage
        offices: [155, 168, 125],      // pale olive
      };

      // Grey for apartments (not featured on this page)
      const greyColor: [number, number, number] = [200, 200, 200];

      // Build segments
      const segments: { value: number; color: [number, number, number]; label?: string }[] = [];

      // Apartments as grey
      if (pveData.percentages?.apartments?.m2 && pveData.percentages.apartments.m2 > 0) {
        segments.push({ value: pveData.percentages.apartments.m2, color: greyColor });
      }

      // Non-residential categories in green
      if (pveData.percentages?.commercial?.m2 && pveData.percentages.commercial.m2 > 0) {
        segments.push({
          value: pveData.percentages.commercial.m2,
          color: categoryColors.commercial,
          label: this.t.commercial.substring(0, 10),
        });
      }
      if (pveData.percentages?.hospitality?.m2 && pveData.percentages.hospitality.m2 > 0) {
        segments.push({
          value: pveData.percentages.hospitality.m2,
          color: categoryColors.hospitality,
          label: this.t.hospitality.substring(0, 10),
        });
      }
      if (pveData.percentages?.social?.m2 && pveData.percentages.social.m2 > 0) {
        segments.push({
          value: pveData.percentages.social.m2,
          color: categoryColors.social,
          label: this.t.social.substring(0, 10),
        });
      }
      if (pveData.percentages?.communal?.m2 && pveData.percentages.communal.m2 > 0) {
        segments.push({
          value: pveData.percentages.communal.m2,
          color: categoryColors.communal,
          label: this.t.communal.substring(0, 10),
        });
      }
      if (pveData.percentages?.offices?.m2 && pveData.percentages.offices.m2 > 0) {
        segments.push({
          value: pveData.percentages.offices.m2,
          color: categoryColors.offices,
          label: this.t.offices.substring(0, 10),
        });
      }

      this.drawPieChart(chartCenterX, chartCenterY, chartRadius, segments, chartRadius * 0.4);

      // Total m² in center
      this.pdf.setFontSize(7);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'bold');
      const nonResTotal = (pveData.percentages?.commercial?.m2 || 0) +
        (pveData.percentages?.hospitality?.m2 || 0) +
        (pveData.percentages?.social?.m2 || 0) +
        (pveData.percentages?.communal?.m2 || 0) +
        (pveData.percentages?.offices?.m2 || 0);
      this.pdf.text(`${nonResTotal.toLocaleString()} m²`, chartCenterX, chartCenterY + 2, { align: 'center' });

      this.currentY = chartCenterY + chartRadius + 8;
    }

    // Commercial Section
    this.pdf.setFontSize(14);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(`${this.t.commercialProgram} (${scenario.commercial.total_m2} m²)`, MARGIN, this.currentY);
    this.currentY += 8;

    this.addSpacesList(scenario.commercial.spaces, ['type', 'size_m2', 'rationale']);

    this.currentY += 5;
    this.pdf.setFontSize(8);
    this.setColor(MUTED_COLOR);
    this.pdf.setFont('helvetica', 'italic');
    const analysisLines = this.wrapText(scenario.commercial.local_amenities_analysis, CONTENT_WIDTH);
    analysisLines.slice(0, 2).forEach((line) => {
      this.pdf.text(line, MARGIN, this.currentY);
      this.currentY += 4;
    });

    // Hospitality Section
    this.currentY += 8;
    this.checkPageBreak(40);

    this.pdf.setFontSize(12);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(`${this.t.hospitalityProgram} (${scenario.hospitality.total_m2} m²)`, MARGIN, this.currentY);
    this.currentY += 6;

    // Use table format for hospitality concept
    this.addSpacesTable([{
      type: this.locale === 'nl' ? 'Horeca concept' : 'Hospitality concept',
      size_m2: scenario.hospitality.total_m2,
      rationale: scenario.hospitality.concept,
    }]);

    // Social Section
    this.currentY += 8;
    this.checkPageBreak(40);

    this.pdf.setFontSize(12);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(`${this.t.socialProgram} (${scenario.social.total_m2} m²)`, MARGIN, this.currentY);
    this.currentY += 8;

    this.addSpacesList(scenario.social.facilities, ['type', 'size_m2', 'rationale']);

    // Communal Section
    this.currentY += 8;
    this.checkPageBreak(40);

    this.pdf.setFontSize(12);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(`${this.t.communalProgram} (${scenario.communal.total_m2} m²)`, MARGIN, this.currentY);
    this.currentY += 8;

    const communalSpaces = scenario.communal.amenities.map(a => ({
      type: a.amenity_name,
      size_m2: a.size_m2,
      rationale: a.rationale,
    }));
    this.addSpacesList(communalSpaces, ['type', 'size_m2', 'rationale']);

    // Offices Section
    this.currentY += 8;
    this.checkPageBreak(30);

    this.pdf.setFontSize(12);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(`${this.t.officeProgram} (${scenario.offices.total_m2} m²)`, MARGIN, this.currentY);
    this.currentY += 6;

    // Use table format for offices concept
    this.addSpacesTable([{
      type: this.locale === 'nl' ? 'Kantoor concept' : 'Office concept',
      size_m2: scenario.offices.total_m2,
      rationale: scenario.offices.concept,
    }]);
  }

  /**
   * Add a styled table for spaces/facilities (matching residential table style)
   */
  private addSpacesTable(
    spaces: { type: string; size_m2: number; rationale: string }[]
  ): void {
    if (spaces.length === 0) return;

    const colWidths = [50, 25, 95];
    const rowHeight = 10;

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');

    this.pdf.setFontSize(8);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');

    let headerX = MARGIN + 2;
    [this.t.type, 'm²', this.t.rationale].forEach((header, i) => {
      this.pdf.text(header, headerX, this.currentY + 7);
      headerX += colWidths[i];
    });
    this.currentY += rowHeight;

    // Table rows
    this.pdf.setFont('helvetica', 'normal');
    spaces.forEach((space, index) => {
      this.checkPageBreak(rowHeight + 5);

      const isEven = index % 2 === 0;
      if (isEven) {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');
      }

      // Cell borders
      this.setColor(BORDER_COLOR, 'draw');
      this.pdf.setLineWidth(0.2);
      let cellX = MARGIN;
      colWidths.forEach((w) => {
        this.pdf.rect(cellX, this.currentY, w, rowHeight, 'D');
        cellX += w;
      });

      // Cell content
      this.pdf.setFontSize(7);
      this.setColor(TEXT_COLOR);

      cellX = MARGIN + 2;

      // Type
      const typeText = this.wrapText(space.type, colWidths[0] - 4)[0];
      this.pdf.text(typeText, cellX, this.currentY + 6);
      cellX += colWidths[0];

      // Size
      this.pdf.text(`${space.size_m2}`, cellX, this.currentY + 6);
      cellX += colWidths[1];

      // Rationale
      const rationaleText = this.wrapText(space.rationale, colWidths[2] - 4)[0];
      this.pdf.text(rationaleText, cellX, this.currentY + 6);

      this.currentY += rowHeight;
    });
  }

  /**
   * Legacy method - now redirects to addSpacesTable
   */
  private addSpacesList(
    spaces: { type: string; size_m2: number; rationale: string }[],
    fields: string[]
  ): void {
    this.addSpacesTable(spaces);
  }

  // ==========================================================================
  // APPENDIX SECTIONS
  // ==========================================================================

  addAppendix(
    compactData: CompactExportData,
    mapCaptures?: MapCaptureResult[]
  ): void {
    // A. Total Score Table (includes appendix header)
    this.addTotalScoreTable(compactData.targetGroups.rankedPersonas, true);

    // B. Detailed Score Table (Summary)
    this.addDetailedScoreTable(compactData.targetGroups.rankedPersonas);

    // C. Environmental Scores
    this.addEnvironmentalScores(compactData.amenities);

    // F. Demographics Table
    this.addDataTable(this.t.demographicsTable, this.flattenDemographics(compactData.demographics));

    // G. Housing Market Table
    this.addHousingMarketTable(compactData.housingMarket);

    // H. Safety Table
    this.addDataTable(this.t.safetyTable, this.flattenSafety(compactData.safety));

    // I. Health Table
    this.addDataTable(this.t.healthTable, this.flattenHealth(compactData.health));

    // J. Livability Table
    this.addDataTable(this.t.livabilityTable, this.flattenLivability(compactData.livability));

    // K. Amenities Table
    this.addAmenitiesTable(compactData.amenities);

    // L. Map Analysis
    if (mapCaptures && mapCaptures.length > 0) {
      this.addMapAnalysis(mapCaptures);
    }
  }

  private addTotalScoreTable(rankedPersonas: RankedPersona[], includeAppendixHeader = false): void {
    this.addNewPage();

    // Add main appendix header and TOC entry if this is the first appendix section
    if (includeAppendixHeader) {
      this.addTocEntry(this.t.appendix, 0);

      this.pdf.setFontSize(18);
      this.setColor(PRIMARY_COLOR);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(this.t.appendix, MARGIN, this.currentY);
      this.currentY += 12;
    }

    this.addTocEntry(this.t.totalScoreTable, 1);

    this.pdf.setFontSize(14);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.totalScoreTable, MARGIN, this.currentY);
    this.currentY += 10;

    const colWidths = [15, 55, 35, 30, 35];
    const rowHeight = 8;

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');

    this.pdf.setFontSize(8);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');

    let headerX = MARGIN + 2;
    [this.t.rank, this.t.persona, this.t.income, this.t.household, this.t.score].forEach((header, i) => {
      this.pdf.text(header, headerX, this.currentY + 5.5);
      headerX += colWidths[i];
    });
    this.currentY += rowHeight;

    // Table rows
    rankedPersonas.forEach((persona, index) => {
      this.checkPageBreak(rowHeight + 5);

      const isEven = index % 2 === 0;
      if (isEven) {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');
      }

      this.pdf.setFontSize(7);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');

      let cellX = MARGIN + 2;
      this.pdf.text(persona.rank.toString(), cellX, this.currentY + 5.5);
      cellX += colWidths[0];

      const nameText = this.wrapText(persona.name, colWidths[1] - 4)[0];
      this.pdf.text(nameText, cellX, this.currentY + 5.5);
      cellX += colWidths[1];

      const incomeText = this.wrapText(persona.incomeLevel, colWidths[2] - 4)[0];
      this.pdf.text(incomeText, cellX, this.currentY + 5.5);
      cellX += colWidths[2];

      const householdText = this.wrapText(persona.householdType, colWidths[3] - 4)[0];
      this.pdf.text(householdText, cellX, this.currentY + 5.5);
      cellX += colWidths[3];

      // Score with color coding
      const scoreColor = persona.score >= 0.4 ? [34, 197, 94] : persona.score >= 0.35 ? [245, 158, 11] : [239, 68, 68];
      this.pdf.setTextColor(...scoreColor as [number, number, number]);
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.text(persona.score.toFixed(2), cellX, this.currentY + 5.5);

      this.currentY += rowHeight;
    });
  }

  private addDetailedScoreTable(rankedPersonas: RankedPersona[]): void {
    this.addNewPage();
    this.addTocEntry(this.t.detailedScoreTable, 1);

    this.pdf.setFontSize(14);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.detailedScoreTable, MARGIN, this.currentY);
    this.currentY += 10;

    // Category score headers
    const categories = ['Voorzieningen', 'Leefbaarheid', 'Woningvoorraad', 'Demografie'];
    const colWidths = [50, 30, 30, 30, 30];
    const rowHeight = 7;

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');

    this.pdf.setFontSize(7);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');

    let headerX = MARGIN + 2;
    ['Persona', ...categories].forEach((header, i) => {
      this.pdf.text(header, headerX, this.currentY + 5);
      headerX += colWidths[i];
    });
    this.currentY += rowHeight;

    // Table rows
    rankedPersonas.forEach((persona, index) => {
      this.checkPageBreak(rowHeight + 3);

      const isEven = index % 2 === 0;
      if (isEven) {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');
      }

      this.pdf.setFontSize(6);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');

      let cellX = MARGIN + 2;
      const nameText = this.wrapText(persona.name, colWidths[0] - 4)[0];
      this.pdf.text(nameText, cellX, this.currentY + 5);
      cellX += colWidths[0];

      // Category scores
      const scores = [
        persona.categoryScores.voorzieningen,
        persona.categoryScores.leefbaarheid,
        persona.categoryScores.woningvooraad,
        persona.categoryScores.demografie,
      ];

      scores.forEach((score, i) => {
        const scoreStr = typeof score === 'number' ? score.toFixed(2) : '-';
        this.pdf.text(scoreStr, cellX, this.currentY + 5);
        cellX += colWidths[i + 1];
      });

      this.currentY += rowHeight;
    });
  }

  private addEnvironmentalScores(amenities: AmenitiesData): void {
    this.addNewPage();
    this.addTocEntry(this.t.environmentalScores, 1);

    this.pdf.setFontSize(14);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.environmentalScores, MARGIN, this.currentY);
    this.currentY += 10;

    const colWidths = [60, 20, 25, 25, 25, 25];
    const rowHeight = 8;

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');

    this.pdf.setFontSize(7);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');

    let headerX = MARGIN + 2;
    ['Categorie', 'Aantal', 'Score', 'Nabijheid', 'Bonus', 'Dichtstbij'].forEach((header, i) => {
      this.pdf.text(header, headerX, this.currentY + 5.5);
      headerX += colWidths[i];
    });
    this.currentY += rowHeight;

    // Table rows
    amenities.items.forEach((item, index) => {
      this.checkPageBreak(rowHeight + 3);

      const isEven = index % 2 === 0;
      if (isEven) {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');
      }

      this.pdf.setFontSize(6);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');

      let cellX = MARGIN + 2;
      const nameText = this.wrapText(item.name, colWidths[0] - 4)[0];
      this.pdf.text(nameText, cellX, this.currentY + 5.5);
      cellX += colWidths[0];

      this.pdf.text(item.count.toString(), cellX, this.currentY + 5.5);
      cellX += colWidths[1];

      this.pdf.text(item.countScore.toFixed(2), cellX, this.currentY + 5.5);
      cellX += colWidths[2];

      this.pdf.text(item.proximityCount.toString(), cellX, this.currentY + 5.5);
      cellX += colWidths[3];

      this.pdf.text(item.proximityBonus.toString(), cellX, this.currentY + 5.5);
      cellX += colWidths[4];

      this.pdf.text(`${item.closestDistance}m`, cellX, this.currentY + 5.5);

      this.currentY += rowHeight;
    });
  }

  private addDataTable(title: string, data: { name: string; neighborhood: string; municipality: string; national: string }[]): void {
    this.addNewPage();
    this.addTocEntry(title, 1);

    this.pdf.setFontSize(14);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(title, MARGIN, this.currentY);
    this.currentY += 10;

    const colWidths = [70, 33, 33, 34];
    const rowHeight = 7;

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');

    this.pdf.setFontSize(7);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');

    let headerX = MARGIN + 2;
    ['Indicator', this.t.neighborhood, this.t.municipality, this.t.national].forEach((header, i) => {
      this.pdf.text(header, headerX, this.currentY + 5);
      headerX += colWidths[i];
    });
    this.currentY += rowHeight;

    // Table rows
    data.forEach((row, index) => {
      this.checkPageBreak(rowHeight + 3);

      const isEven = index % 2 === 0;
      if (isEven) {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');
      }

      this.pdf.setFontSize(6);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');

      let cellX = MARGIN + 2;
      const nameText = this.wrapText(row.name, colWidths[0] - 4)[0];
      this.pdf.text(nameText, cellX, this.currentY + 5);
      cellX += colWidths[0];

      this.pdf.text(row.neighborhood || '-', cellX, this.currentY + 5);
      cellX += colWidths[1];

      this.pdf.text(row.municipality || '-', cellX, this.currentY + 5);
      cellX += colWidths[2];

      this.pdf.text(row.national || '-', cellX, this.currentY + 5);

      this.currentY += rowHeight;
    });
  }

  private addHousingMarketTable(housing: HousingMarketData): void {
    this.addNewPage();
    this.addTocEntry(this.t.housingTable, 1);

    this.pdf.setFontSize(14);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.housingTable, MARGIN, this.currentY);
    this.currentY += 10;

    // Summary stats table
    const summaryColWidths = [70, 100];
    const summaryRowHeight = 8;

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, summaryRowHeight, 'F');

    this.pdf.setFontSize(8);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.locale === 'nl' ? 'Kenmerk' : 'Property', MARGIN + 2, this.currentY + 5.5);
    this.pdf.text(this.locale === 'nl' ? 'Waarde' : 'Value', MARGIN + summaryColWidths[0] + 2, this.currentY + 5.5);
    this.currentY += summaryRowHeight;

    // Summary rows
    const summaryData = [
      [this.locale === 'nl' ? 'Gemiddelde prijs' : 'Average price', `€${housing.avgPrice.toLocaleString()}`],
      [this.locale === 'nl' ? 'Gemiddelde grootte' : 'Average size', `${housing.avgSize} m²`],
      [this.locale === 'nl' ? 'Gemiddeld bouwjaar' : 'Average build year', `${housing.avgBuildYear}`],
    ];

    summaryData.forEach((row, index) => {
      if (index % 2 === 0) {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, summaryRowHeight, 'F');
      }
      this.pdf.setFontSize(8);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(row[0], MARGIN + 2, this.currentY + 5.5);
      this.pdf.text(row[1], MARGIN + summaryColWidths[0] + 2, this.currentY + 5.5);
      this.currentY += summaryRowHeight;
    });

    this.currentY += 10;

    // Type distribution table
    this.pdf.setFontSize(11);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.locale === 'nl' ? 'Woningtypes' : 'Housing Types', MARGIN, this.currentY);
    this.currentY += 6;

    const typeColWidths = [120, 50];

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, summaryRowHeight, 'F');

    this.pdf.setFontSize(8);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.locale === 'nl' ? 'Type' : 'Type', MARGIN + 2, this.currentY + 5.5);
    this.pdf.text(this.locale === 'nl' ? 'Percentage' : 'Percentage', MARGIN + typeColWidths[0] + 2, this.currentY + 5.5);
    this.currentY += summaryRowHeight;

    housing.typeDistribution.forEach((item, index) => {
      if (index % 2 === 0) {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, summaryRowHeight, 'F');
      }
      this.pdf.setFontSize(8);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(item.type, MARGIN + 2, this.currentY + 5.5);
      this.pdf.text(`${item.percentage}%`, MARGIN + typeColWidths[0] + 2, this.currentY + 5.5);
      this.currentY += summaryRowHeight;
    });

    this.currentY += 10;

    // Price distribution table
    this.pdf.setFontSize(11);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.locale === 'nl' ? 'Prijsverdeling' : 'Price Distribution', MARGIN, this.currentY);
    this.currentY += 6;

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, summaryRowHeight, 'F');

    this.pdf.setFontSize(8);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.locale === 'nl' ? 'Prijsklasse' : 'Price Range', MARGIN + 2, this.currentY + 5.5);
    this.pdf.text(this.locale === 'nl' ? 'Percentage' : 'Percentage', MARGIN + typeColWidths[0] + 2, this.currentY + 5.5);
    this.currentY += summaryRowHeight;

    housing.priceDistribution.forEach((item, index) => {
      if (index % 2 === 0) {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, summaryRowHeight, 'F');
      }
      this.pdf.setFontSize(8);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.text(item.range, MARGIN + 2, this.currentY + 5.5);
      this.pdf.text(`${item.percentage}%`, MARGIN + typeColWidths[0] + 2, this.currentY + 5.5);
      this.currentY += summaryRowHeight;
    });
  }

  private addAmenitiesTable(amenities: AmenitiesData): void {
    this.addNewPage();
    this.addTocEntry(this.t.amenitiesTable, 1);

    this.pdf.setFontSize(14);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.amenitiesTable, MARGIN, this.currentY);
    this.currentY += 10;

    const colWidths = [55, 20, 30, 35, 30];
    const rowHeight = 8;

    // Table header
    this.setColor(PRIMARY_COLOR, 'fill');
    this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');

    this.pdf.setFontSize(7);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.setFont('helvetica', 'bold');

    let headerX = MARGIN + 2;
    ['Voorziening', 'Aantal', 'Dichtstbij', 'Gem. afstand', 'Score'].forEach((header, i) => {
      this.pdf.text(header, headerX, this.currentY + 5.5);
      headerX += colWidths[i];
    });
    this.currentY += rowHeight;

    // Table rows
    amenities.items.forEach((item, index) => {
      this.checkPageBreak(rowHeight + 3);

      const isEven = index % 2 === 0;
      if (isEven) {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(MARGIN, this.currentY, CONTENT_WIDTH, rowHeight, 'F');
      }

      this.pdf.setFontSize(6);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');

      let cellX = MARGIN + 2;
      const nameText = this.wrapText(item.name, colWidths[0] - 4)[0];
      this.pdf.text(nameText, cellX, this.currentY + 5.5);
      cellX += colWidths[0];

      this.pdf.text(item.count.toString(), cellX, this.currentY + 5.5);
      cellX += colWidths[1];

      this.pdf.text(`${item.closestDistance}m`, cellX, this.currentY + 5.5);
      cellX += colWidths[2];

      this.pdf.text(`${Math.round(item.averageDistance)}m`, cellX, this.currentY + 5.5);
      cellX += colWidths[3];

      // Score with color
      const scoreColor = item.countScore >= 0.75 ? [34, 197, 94] : item.countScore >= 0.5 ? [245, 158, 11] : [239, 68, 68];
      this.pdf.setTextColor(...scoreColor as [number, number, number]);
      this.pdf.text(item.countScore.toFixed(2), cellX, this.currentY + 5.5);

      this.currentY += rowHeight;
    });
  }

  private addMapAnalysis(mapCaptures: MapCaptureResult[]): void {
    this.addNewPage();
    this.addTocEntry(this.t.mapAnalysis, 1);

    this.pdf.setFontSize(14);
    this.setColor(PRIMARY_COLOR);
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.text(this.t.mapAnalysis, MARGIN, this.currentY);
    this.currentY += 10;

    const mapWidth = 80;
    const mapHeight = 60;
    const mapsPerRow = 2;
    const gap = 10;

    mapCaptures.forEach((map, index) => {
      const col = index % mapsPerRow;
      const row = Math.floor(index / mapsPerRow);

      if (col === 0 && index > 0) {
        this.currentY += mapHeight + 15;
      }

      if (this.currentY + mapHeight > PAGE_HEIGHT - MARGIN) {
        this.addNewPage();
        this.currentY = MARGIN + 10;
      }

      const mapX = MARGIN + col * (mapWidth + gap);
      const mapY = this.currentY;

      try {
        this.pdf.addImage(
          map.dataUrl, 'PNG',
          mapX, mapY,
          mapWidth, mapHeight,
          undefined, 'FAST'
        );
      } catch {
        this.setColor(LIGHT_BG, 'fill');
        this.pdf.rect(mapX, mapY, mapWidth, mapHeight, 'F');
      }

      // Map label
      this.pdf.setFontSize(8);
      this.setColor(TEXT_COLOR);
      this.pdf.setFont('helvetica', 'normal');
      const labelText = this.wrapText(map.name, mapWidth)[0];
      this.pdf.text(labelText, mapX, mapY + mapHeight + 5);
    });
  }

  // ==========================================================================
  // HELPER METHODS FOR DATA FLATTENING
  // ==========================================================================

  private flattenDemographics(data: DemographicsData): { name: string; neighborhood: string; municipality: string; national: string }[] {
    const result: { name: string; neighborhood: string; municipality: string; national: string }[] = [];

    // Age groups
    data.age.forEach(item => result.push({
      name: item.name,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
      national: item.national,
    }));

    // Status
    data.status.forEach(item => result.push({
      name: item.name,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
      national: item.national,
    }));

    // Family type
    data.familyType.forEach(item => result.push({
      name: item.name,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
      national: item.national,
    }));

    // Income
    result.push({
      name: 'Gemiddeld inkomen',
      neighborhood: data.income.neighborhood,
      municipality: data.income.municipality,
      national: data.income.national,
    });

    return result;
  }

  private flattenSafety(data: SafetyData): { name: string; neighborhood: string; municipality: string; national: string }[] {
    return [
      { name: 'Totaal misdrijven', ...data.totalCrimes },
      { name: 'Woninginbraak', ...data.burglary },
      { name: 'Zakkenrollerij', ...data.pickpocketing },
      { name: 'Verkeersongevallen', ...data.accidents },
      { name: 'Voelt zich onveilig', ...data.feelsUnsafe },
      { name: 'Straatverlichting', ...data.streetLighting },
    ].map(item => ({
      name: item.name,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
      national: item.national,
    }));
  }

  private flattenHealth(data: HealthData): { name: string; neighborhood: string; municipality: string; national: string }[] {
    const result: { name: string; neighborhood: string; municipality: string; national: string }[] = [];

    result.push({ name: 'Ervaren gezondheid', ...data.experiencedHealth });
    result.push({ name: 'Sport wekelijks', ...data.sports });
    result.push({ name: 'Roker', ...data.smoker });
    result.push({ name: 'Beperkte gezondheid', ...data.limitedHealth });
    result.push({ name: 'Emotionele steun mist', ...data.emotionalSupport });

    data.weight.forEach(item => result.push({
      name: item.name,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
      national: item.national,
    }));

    data.loneliness.forEach(item => result.push({
      name: item.name,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
      national: item.national,
    }));

    data.psychologicalHealth.forEach(item => result.push({
      name: item.name,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
      national: item.national,
    }));

    return result;
  }

  private flattenLivability(data: LivabilityData): { name: string; neighborhood: string; municipality: string; national: string }[] {
    const result: { name: string; neighborhood: string; municipality: string; national: string }[] = [];

    data.maintenance.forEach(item => result.push({
      name: item.name,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
      national: item.national,
    }));

    result.push({ name: 'Straatverlichting', ...data.streetLighting });

    data.youthFacilities.forEach(item => result.push({
      name: item.name,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
      national: item.national,
    }));

    data.contact.forEach(item => result.push({
      name: item.name,
      neighborhood: item.neighborhood,
      municipality: item.municipality,
      national: item.national,
    }));

    result.push({ name: 'Vrijwilligerswerk', ...data.volunteers });
    result.push({ name: 'Sociale cohesie', ...data.socialCohesion });
    result.push({ name: 'Leefbaarheid score', ...data.livabilityScore });

    return result;
  }

  // ==========================================================================
  // FINALIZATION
  // ==========================================================================

  finalize(): Blob {
    // Update TOC with actual page numbers
    this.updateTableOfContents();

    // Add page footers to all pages
    const totalPages = this.pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.pdf.setPage(i);
      this.currentPage = i;
      if (i > 1) { // Skip title page
        this.addPageFooter();
      }
    }

    return this.pdf.output('blob');
  }

  getPageCount(): number {
    return this.pdf.getNumberOfPages();
  }
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

export async function generateUnifiedRapport(
  compactData: CompactExportData,
  buildingProgram: LLMBuildingProgram,
  cubeCaptures: Record<string, CubeCaptureResult>,
  mapCaptures: MapCaptureResult[],
  config: UnifiedRapportConfig
): Promise<Blob> {
  const builder = new UnifiedRapportBuilder(config.locale);
  const t = TRANSLATIONS[config.locale];

  // Extract PVE percentages for voronoi cover
  const pvePercentages: PVEAllocations = {
    apartments: compactData.pve?.percentages?.apartments?.percentage ?? DEFAULT_PVE_PERCENTAGES.apartments,
    commercial: compactData.pve?.percentages?.commercial?.percentage ?? DEFAULT_PVE_PERCENTAGES.commercial,
    hospitality: compactData.pve?.percentages?.hospitality?.percentage ?? DEFAULT_PVE_PERCENTAGES.hospitality,
    social: compactData.pve?.percentages?.social?.percentage ?? DEFAULT_PVE_PERCENTAGES.social,
    communal: compactData.pve?.percentages?.communal?.percentage ?? DEFAULT_PVE_PERCENTAGES.communal,
    offices: compactData.pve?.percentages?.offices?.percentage ?? DEFAULT_PVE_PERCENTAGES.offices,
  };

  // Generate voronoi cover image
  let voronoiCoverImage: string | undefined;
  try {
    voronoiCoverImage = await generateVoronoiCoverImage(pvePercentages);
  } catch (e) {
    console.warn('Failed to generate voronoi cover image:', e);
  }

  // 1. Title Page
  const projectTitle = buildingProgram.project_title ||
    `${config.locale === 'nl' ? 'Locatie Analyse' : 'Location Analysis'}: ${compactData.metadata.location || 'Rotterdam'}`;
  const address = compactData.metadata.location ||
    `${compactData.metadata.coordinates.lat.toFixed(4)}, ${compactData.metadata.coordinates.lon.toFixed(4)}`;
  builder.addTitlePage(projectTitle, address, compactData.metadata.exportDate, voronoiCoverImage);

  // 2. Table of Contents (placeholder, will be updated at end)
  builder.addTableOfContents();

  // 3. Introduction & SWOT
  const swotAnalysis = buildingProgram.swot_analysis || {
    strengths: [
      'Uitstekende voorzieningen nabij',
      'Goede OV bereikbaarheid',
      'Hoog inkomensniveau',
      'Actieve, sportieve bevolking',
    ],
    weaknesses: [
      'Lagere sociale cohesie',
      'Beperkte budget dining opties',
      'Hoog percentage alleenstaanden',
    ],
    opportunities: [
      'Community building door gedeelde voorzieningen',
      'Betaalbare food concepten',
      'Flexibele werkplekken voor jonge professionals',
    ],
    threats: [
      'Hoge woningprijzen kunnen doorstroming beperken',
      'Vergrijzing op lange termijn',
    ],
  };
  builder.addIntroductionSection(buildingProgram.location_summary, swotAnalysis);

  // 4. Scenario Overview
  const scenarioOverviewText = buildingProgram.scenarios_overview ||
    `Deze analyse presenteert ${buildingProgram.scenarios.length} ontwikkelscenario's, elk gericht op specifieke doelgroepen die passen bij de locatiekenmerken. De scenario's variëren van jonge professionals tot gezinnen, met aangepaste woningtypologieën en voorzieningen.`;

  const scenariosSummary = buildingProgram.scenarios.map(s => ({
    name: s.scenario_name,
    simpleName: s.scenario_simple_name,
    personas: s.target_personas,
  }));
  builder.addScenarioOverview(scenarioOverviewText, scenariosSummary);

  // 5. PVE Section
  builder.addPVESection(compactData.pve);

  // 6-9. Scenario Sections
  const cubeKeys = ['scenario1', 'scenario2', 'scenario3', 'customScenario'];
  buildingProgram.scenarios.forEach((scenario, index) => {
    const cubeKey = cubeKeys[index] || `scenario${index + 1}`;
    const cubeCapture = cubeCaptures[cubeKey];
    builder.addScenarioSection(
      index + 1,
      scenario,
      cubeCapture,
      compactData.allPersonas,
      compactData.pve
    );
  });

  // 10. Appendix
  builder.addAppendix(compactData, config.includeMapAnalysis ? mapCaptures : undefined);

  return builder.finalize();
}

// ============================================================================
// PLACEHOLDER DATA LOADER (for testing without LLM calls)
// ============================================================================

export async function loadPlaceholderBuildingProgram(): Promise<LLMBuildingProgram> {
  try {
    const response = await fetch('/location-building-program-2026-01-23.json');
    return await response.json();
  } catch (error) {
    console.error('Failed to load placeholder building program:', error);
    throw error;
  }
}

export async function loadPlaceholderCompactData(): Promise<CompactExportData> {
  try {
    const response = await fetch('/location-compact-2026-01-23.json');
    return await response.json();
  } catch (error) {
    console.error('Failed to load placeholder compact data:', error);
    throw error;
  }
}
