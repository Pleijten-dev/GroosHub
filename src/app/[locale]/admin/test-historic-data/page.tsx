'use client';

/**
 * Historic Data Test Page
 *
 * Test interface for validating historic data implementation
 * Access at: /admin/test-historic-data
 */

import { useState } from 'react';
import {
  CBSDemographicsClient,
  type GeographicCodes as DemographicsGeographicCodes
} from '@/features/location/data/sources/cbs-demographics/client';
import {
  RIVMHealthClient,
  type GeographicCodes as HealthGeographicCodes
} from '@/features/location/data/sources/rivm-health/client';
import {
  PolitieSafetyClient,
  type GeographicCodes as SafetyGeographicCodes
} from '@/features/location/data/sources/politie-safety/client';
import {
  CBSLivabilityClient,
  type GeographicCodes as LivabilityGeographicCodes
} from '@/features/location/data/sources/cbs-livability/client';
import {
  getAvailableYears,
  getDataAvailabilityMatrix,
  type DataSource
} from '@/features/location/data/sources/historic-datasets';

type TestResult = {
  year: number;
  status: 'success' | 'error' | 'pending';
  message?: string;
  datasetId?: string;
  recordCount?: number;
};

export default function TestHistoricDataPage() {
  const [dataSource, setDataSource] = useState<DataSource>('demographics');
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<TestResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  // Test location: Amsterdam city center
  const testLocation = {
    municipality: 'GM0363',
    district: 'WK036300',
    neighborhood: 'BU03630000'
  };

  const availableYears = getAvailableYears(dataSource);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runTest = async () => {
    if (selectedYears.length === 0) {
      alert('Please select at least one year to test');
      return;
    }

    setIsRunning(true);
    setResults([]);
    setLogs([]);
    setProgress({ current: 0, total: selectedYears.length });

    addLog(`Starting test for ${dataSource} with ${selectedYears.length} years`);
    addLog(`Test location: Municipality ${testLocation.municipality}`);

    const testResults: TestResult[] = selectedYears.map(year => ({
      year,
      status: 'pending'
    }));
    setResults(testResults);

    try {
      switch (dataSource) {
        case 'demographics':
          await testDemographics(selectedYears);
          break;
        case 'health':
          await testHealth(selectedYears);
          break;
        case 'safety':
          await testSafety(selectedYears);
          break;
        case 'livability':
          await testLivability(selectedYears);
          break;
      }
    } catch (error) {
      addLog(`❌ Test failed: ${error}`);
    } finally {
      setIsRunning(false);
      addLog('✅ Test completed');
    }
  };

  const testDemographics = async (years: number[]) => {
    const client = new CBSDemographicsClient();

    const historicData = await client.fetchHistoricData(
      testLocation as DemographicsGeographicCodes,
      years,
      {
        onProgress: (current, total, year) => {
          setProgress({ current, total });
          addLog(`Fetching demographics for ${year}...`);
        }
      }
    );

    const updatedResults: TestResult[] = [];

    for (const year of years) {
      const data = historicData.get(year);
      if (data) {
        const hasData = data.data.neighborhood || data.data.district || data.data.municipality;
        // Calculate record count from whichever level has data
        const recordCount =
          Object.keys(data.data.neighborhood?.data || {}).length ||
          Object.keys(data.data.district?.data || {}).length ||
          Object.keys(data.data.municipality?.data || {}).length;
        updatedResults.push({
          year,
          status: hasData ? 'success' : 'error',
          message: hasData ? 'Data fetched successfully' : 'No data available',
          datasetId: data.datasetId,
          recordCount
        });
        addLog(`✅ ${year}: Dataset ${data.datasetId}, ${hasData ? 'data found' : 'no data'} (${recordCount} records)`);
      } else {
        updatedResults.push({
          year,
          status: 'error',
          message: 'Failed to fetch data'
        });
        addLog(`❌ ${year}: Failed to fetch`);
      }
    }

    setResults(updatedResults);
  };

  const testHealth = async (years: number[]) => {
    const client = new RIVMHealthClient();

    const historicData = await client.fetchHistoricData(
      testLocation as HealthGeographicCodes,
      years,
      {
        onProgress: (current, total, year) => {
          setProgress({ current, total });
          addLog(`Fetching health data for ${year}...`);
        }
      }
    );

    const updatedResults: TestResult[] = [];

    for (const year of years) {
      const data = historicData.get(year);
      if (data) {
        const hasData = data.data.neighborhood || data.data.district || data.data.municipality;
        // Calculate record count from whichever level has data
        const recordCount =
          Object.keys(data.data.neighborhood?.data || {}).length ||
          Object.keys(data.data.district?.data || {}).length ||
          Object.keys(data.data.municipality?.data || {}).length;
        updatedResults.push({
          year,
          status: hasData ? 'success' : 'error',
          message: hasData ? 'Data fetched successfully' : 'No data available',
          recordCount
        });
        addLog(`✅ ${year}: ${hasData ? 'data found' : 'no data'} (${recordCount} records)`);
      } else {
        updatedResults.push({
          year,
          status: 'error',
          message: 'Failed to fetch data'
        });
        addLog(`❌ ${year}: Failed to fetch`);
      }
    }

    setResults(updatedResults);
  };

  const testSafety = async (years: number[]) => {
    const client = new PolitieSafetyClient();

    const historicData = await client.fetchHistoricData(
      testLocation as SafetyGeographicCodes,
      years,
      {
        onProgress: (current, total, year) => {
          setProgress({ current, total });
          addLog(`Fetching safety data for ${year}...`);
        }
      }
    );

    const updatedResults: TestResult[] = [];

    for (const year of years) {
      const data = historicData.get(year);
      if (data) {
        const hasData = data.data.neighborhood || data.data.district || data.data.municipality;
        // Calculate record count from whichever level has data
        const recordCount =
          Object.keys(data.data.neighborhood?.data || {}).length ||
          Object.keys(data.data.district?.data || {}).length ||
          Object.keys(data.data.municipality?.data || {}).length;
        updatedResults.push({
          year,
          status: hasData ? 'success' : 'error',
          message: hasData ? 'Data fetched successfully' : 'No data available',
          recordCount
        });
        addLog(`✅ ${year}: ${hasData ? 'data found' : 'no data'} (${recordCount} records)`);
      } else {
        updatedResults.push({
          year,
          status: 'error',
          message: 'Failed to fetch data'
        });
        addLog(`❌ ${year}: Failed to fetch`);
      }
    }

    setResults(updatedResults);
  };

  const testLivability = async (years: number[]) => {
    const client = new CBSLivabilityClient();

    const historicData = await client.fetchHistoricData(
      { municipality: testLocation.municipality } as LivabilityGeographicCodes,
      years,
      {
        onProgress: (current, total, year) => {
          setProgress({ current, total });
          addLog(`Fetching livability data for ${year}...`);
        }
      }
    );

    const updatedResults: TestResult[] = [];

    for (const year of years) {
      const data = historicData.get(year);
      if (data) {
        const hasData = data.data.municipality;
        const recordCount = Object.keys(data.data.municipality?.data || {}).length;
        updatedResults.push({
          year,
          status: hasData ? 'success' : 'error',
          message: hasData ? 'Data fetched successfully' : 'No data available',
          recordCount
        });
        addLog(`✅ ${year}: ${hasData ? 'data found' : 'no data'} (${recordCount} records)`);
      } else {
        updatedResults.push({
          year,
          status: 'error',
          message: 'Failed to fetch data'
        });
        addLog(`❌ ${year}: Failed to fetch`);
      }
    }

    setResults(updatedResults);
  };

  const toggleYear = (year: number) => {
    setSelectedYears(prev =>
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year].sort((a, b) => b - a)
    );
  };

  const selectAll = () => {
    setSelectedYears([...availableYears]);
  };

  const clearAll = () => {
    setSelectedYears([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧪 Historic Data Test Suite
          </h1>
          <p className="text-gray-600">
            Test the historic data implementation for Dutch government datasets
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Data Source Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">1. Select Data Source</h2>
              <div className="space-y-2">
                {(['demographics', 'health', 'safety', 'livability'] as DataSource[]).map(source => (
                  <button
                    key={source}
                    onClick={() => {
                      setDataSource(source);
                      setSelectedYears([]);
                      setResults([]);
                    }}
                    className={`w-full px-4 py-3 rounded-lg text-left transition-colors ${
                      dataSource === source
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="font-medium capitalize">{source}</div>
                    <div className="text-sm opacity-75">
                      {getAvailableYears(source).length} years available
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Year Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">2. Select Years</h2>
                <div className="space-x-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    All
                  </button>
                  <button
                    onClick={clearAll}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                {availableYears.map(year => (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                      selectedYears.includes(year)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>

              <div className="mt-4 text-sm text-gray-600">
                {selectedYears.length} year{selectedYears.length !== 1 ? 's' : ''} selected
              </div>
            </div>

            {/* Run Test Button */}
            <button
              onClick={runTest}
              disabled={isRunning || selectedYears.length === 0}
              className={`w-full px-6 py-4 rounded-lg font-semibold text-white transition-colors ${
                isRunning || selectedYears.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isRunning ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Running Test... ({progress.current}/{progress.total})
                </span>
              ) : (
                '▶ Run Test'
              )}
            </button>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Results Table */}
            {results.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Test Results</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Year
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Records
                        </th>
                        {dataSource === 'demographics' && (
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dataset ID
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Message
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map(result => (
                        <tr key={result.year}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {result.year}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              result.status === 'success' ? 'bg-green-100 text-green-800' :
                              result.status === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {result.status === 'success' ? '✅ Success' :
                               result.status === 'error' ? '❌ Error' :
                               '⏳ Pending'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {result.recordCount || '-'}
                          </td>
                          {dataSource === 'demographics' && (
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {result.datasetId || '-'}
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {result.message || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {results.filter(r => r.status === 'success').length}
                      </div>
                      <div className="text-sm text-gray-600">Successful</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">
                        {results.filter(r => r.status === 'error').length}
                      </div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {results.filter(r => r.status === 'pending').length}
                      </div>
                      <div className="text-sm text-gray-600">Pending</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logs Panel */}
            {logs.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Console Logs</h2>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
                  {logs.map((log, idx) => (
                    <div key={idx} className="mb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">ℹ️ Test Information</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li><strong>Test Location:</strong> Amsterdam (GM0363, WK036300, BU03630000)</li>
            <li><strong>Rate Limiting:</strong> 200ms delay between requests</li>
            <li><strong>Demographics:</strong> Each year uses a different dataset ID</li>
            <li><strong>Health:</strong> Only 4 snapshots available (2012, 2016, 2020, 2022)</li>
            <li><strong>Safety:</strong> Continuous annual data from 2012-2024</li>
            <li><strong>Livability:</strong> Only 2 years (2021, 2023) - municipality level only</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
