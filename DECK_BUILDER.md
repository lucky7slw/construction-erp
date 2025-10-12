# AI-Powered Deck Builder Module

## Overview
The Deck Builder module uses AI to automate the entire deck planning process, from design to permits to cost estimation.

## Features

### 1. AI Design Generation
- Structural calculations based on IRC (International Residential Code)
- Automatic joist, beam, and post sizing
- Load calculations (live load, dead load, snow load)
- Footing depth and diameter calculations
- Compliance with building codes

### 2. Materials List
- Complete bill of materials with quantities
- Waste factor calculations (default 10%)
- Material specifications (dimensions, grade, treatment)
- Cost estimates from pricing databases
- Alternative material suggestions

### 3. Permit Research
- Automatic jurisdiction identification (city/county)
- Building permit requirements extraction
- Zoning compliance checking
- Required documents list
- Fee estimates
- Contact information for permit offices

### 4. Property Data Integration
- GIS data retrieval (when available)
- Parcel information
- Zoning codes and restrictions
- Setback requirements
- HOA information
- Flood zone and wetlands data

### 5. Code Compliance
- IRC structural requirements
- Safety code compliance
- Accessibility requirements
- Height and setback restrictions
- Railing and stair specifications

### 6. Labor Estimation
- Task-based labor hours
- Crew size recommendations
- Skill level requirements
- Equipment needs
- Weather dependency factors

### 7. Cost Breakdown
- Materials cost
- Labor cost
- Permit fees
- Equipment rental
- Overhead and profit margins
- Total project cost

## API Endpoints

### Generate Complete Deck Plan
```
POST /api/v1/deck/generate-plan
```

**Request Body:**
```json
{
  "deckType": "ATTACHED",
  "deckShape": "RECTANGLE",
  "length": 16,
  "width": 12,
  "height": 3,
  "propertyAddress": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "postalCode": "62701",
  "primaryMaterial": "PRESSURE_TREATED_LUMBER",
  "railingType": "WOOD_BALUSTERS",
  "budgetRange": "$5000-$15000"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projectInfo": {
      "id": "...",
      "name": "16x12 Attached Deck",
      "estimatedMaterialCost": 4500,
      "estimatedLaborCost": 3200,
      "estimatedPermitCost": 350,
      "estimatedTotalCost": 8050,
      "estimatedLaborHours": 40,
      "estimatedDuration": 5
    },
    "design": {
      "deckingArea": 192,
      "joistSpacing": 16,
      "beamSize": "2x10",
      "postSize": "4x4",
      "postCount": 6,
      "footingDepth": 36,
      "footingDiameter": 12
    },
    "materials": [
      {
        "category": "Decking",
        "name": "2x6x12 Pressure Treated Decking",
        "quantity": 35,
        "unit": "pieces",
        "totalCost": 875
      }
    ],
    "permits": [
      {
        "permitType": "Building Permit",
        "jurisdictionName": "City of Springfield",
        "isRequired": true,
        "estimatedCost": 350,
        "requirements": [...]
      }
    ],
    "codeRequirements": [...],
    "laborEstimates": [...],
    "costBreakdown": [...]
  }
}
```

### List Deck Projects
```
GET /api/v1/deck/projects
```

### Get Deck Project Details
```
GET /api/v1/deck/projects/:id
```

## Database Schema

### DeckProject
- Basic project information
- Dimensions and specifications
- Location and property data
- Cost estimates and actuals
- Timeline information
- Customer preferences

### DeckDesign
- Detailed structural design
- Load calculations
- Feature specifications
- 3D model data
- Version control

### DeckMaterial
- Material specifications
- Quantities with waste factors
- Pricing information
- Supplier details
- AI alternatives

### DeckPermit
- Permit requirements
- Application status
- Required documents
- Fees and costs
- Inspection schedule

### DeckPropertyData
- Parcel information
- Zoning codes
- Setback requirements
- HOA information
- GIS data

### DeckCodeRequirement
- Building code references
- Compliance requirements
- Numeric specifications
- Priority levels

### DeckLaborEstimate
- Task breakdown
- Time estimates
- Crew requirements
- Skill levels

### DeckCostBreakdown
- Category-based costs
- Variance tracking
- AI optimization suggestions

## IRC Standards Implemented

- Minimum footing depth: 30" below frost line
- Minimum lateral load: 1500 lbs
- Live load (residential): 40 PSF
- Live load (high occupancy): 100 PSF
- Dead load: 10 PSF
- Maximum joist spacing: 16"
- Minimum railing height: 36"
- Maximum baluster spacing: 4"
- Minimum stair width: 36"
- Maximum riser height: 7.75"
- Minimum tread depth: 10"

## Usage

### Frontend
Navigate to `/deck-builder` in the application to access the AI Deck Builder interface.

### Features
1. Enter deck dimensions and specifications
2. Provide property address for permit research
3. Select materials and preferences
4. Click "Generate AI Deck Plan"
5. Review complete plan with:
   - Design specifications
   - Materials list
   - Cost breakdown
   - Permit requirements
   - Labor estimates

## AI Capabilities

The system uses Google's Gemini AI to:
- Analyze structural requirements
- Research local building codes
- Extract permit requirements from jurisdiction websites
- Calculate optimal material quantities
- Estimate labor hours based on complexity
- Suggest cost-saving alternatives
- Identify potential risks
- Generate recommendations

## Future Enhancements

- 3D deck visualization
- Integration with Google Maps for property imagery
- Real-time pricing from suppliers (1build API)
- Automated permit application generation
- Progress tracking during construction
- Photo documentation
- Customer approval workflow
- Material ordering integration
- Contractor scheduling

## Notes

- Permit research requires internet access to jurisdiction websites
- GIS data availability varies by location
- Cost estimates are approximate and should be verified
- Always consult local building officials for final permit requirements
- Professional engineering review may be required for complex designs
