import React, { useState } from 'react';

const tabList = [
  'General',
  'Performance',
  'Flake Configuration',
  'Chemical Properties',
  'Other Properties',
];

const initialElementRows = [{ element: '', spec: '' }];
const initialPhaseRows = [{ element: '', spec: '' }];
const initialJMultiplierRows = [{ mag: '', multiplier: '' }];

const SystemConfiguration = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('General');
  const [elementRows, setElementRows] = useState(initialElementRows);
  const [phaseRows, setPhaseRows] = useState(initialPhaseRows);
  const [jMultiplierRows, setJMultiplierRows] = useState(initialJMultiplierRows);

  // Add/Remove row handlers for tables
  const addElementRow = () => {
    if (elementRows.length < 8) setElementRows([...elementRows, { element: '', spec: '' }]);
  };
  const removeElementRow = (idx) => {
    if (elementRows.length > 1) setElementRows(elementRows.filter((_, i) => i !== idx));
  };
  const updateElementRow = (idx, field, value) => {
    setElementRows(elementRows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const addPhaseRow = () => {
    if (phaseRows.length < 5) setPhaseRows([...phaseRows, { element: '', spec: '' }]);
  };
  const removePhaseRow = (idx) => {
    if (phaseRows.length > 1) setPhaseRows(phaseRows.filter((_, i) => i !== idx));
  };
  const updatePhaseRow = (idx, field, value) => {
    setPhaseRows(phaseRows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  const addJMultiplierRow = () => {
    setJMultiplierRows([...jMultiplierRows, { mag: '', multiplier: '' }]);
  };
  const removeJMultiplierRow = (idx) => {
    if (jMultiplierRows.length > 1) setJMultiplierRows(jMultiplierRows.filter((_, i) => i !== idx));
  };
  const updateJMultiplierRow = (idx, field, value) => {
    setJMultiplierRows(jMultiplierRows.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  };

  // Placeholder for all other fields (expand as needed)
  const [fields, setFields] = useState({});
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFields((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Tab content renderers
  const renderTabContent = () => {
    switch (activeTab) {
      case 'General':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium">Company Name *</label>
                <input name="companyName" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Address Line1</label>
                <input name="address1" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Address Line2</label>
                <input name="address2" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">City</label>
                <input name="city" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">State</label>
                <input name="state" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Country</label>
                <input name="country" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div className="col-span-1 flex flex-col justify-end">
                <label className="block text-sm font-medium">Company Logo</label>
                <input type="file" name="logo" className="w-full" />
              </div>
              <div className="col-span-1 flex items-center justify-center text-gray-400 border border-dashed h-16">YOUR LOGO</div>
            </div>
            <div className="grid grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium">Measure Unit</label>
                <select name="unit" className="w-full border rounded px-2 py-1" onChange={handleInputChange}>
                  <option value="microns">microns</option>
                  <option value="mm">mm</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Number of images displayed</label>
                <input name="numImages" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Image Resolution</label>
                <input name="imageResolution" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Decimal points <span className="text-red-500">*</span></label>
                <input name="decimalPoints" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Image Format</label>
                <select name="imageFormat" className="w-full border rounded px-2 py-1" onChange={handleInputChange}>
                  <option value="jpg">jpg</option>
                  <option value="png">png</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Report Format</label>
                <select name="reportFormat" className="w-full border rounded px-2 py-1" onChange={handleInputChange}>
                  <option value="Excel">Excel</option>
                  <option value="PDF">PDF</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium">Scale length</label>
                <input name="scaleLength" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                <span className="text-xs text-gray-500">microns</span>
              </div>
              <div className="col-span-2 flex items-end gap-2">
                <label className="block text-sm font-medium">Custom/Standard Report</label>
                <div className="flex gap-2 ml-2">
                  <label className="flex items-center"><input type="radio" name="reportType" value="Standard" onChange={handleInputChange} /> <span className="ml-1">Standard</span></label>
                  <label className="flex items-center"><input type="radio" name="reportType" value="Custom" onChange={handleInputChange} /> <span className="ml-1">Custom</span></label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Display Font Size</label>
                <input name="fontSize" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                <span className="text-xs text-gray-500">Pixels</span>
              </div>
              <div className="col-span-2 flex items-end gap-2">
                <label className="block text-sm font-medium">Report Header?</label>
                <div className="flex gap-2 ml-2">
                  <label className="flex items-center"><input type="radio" name="reportHeader" value="Yes" onChange={handleInputChange} /> <span className="ml-1">Yes</span></label>
                  <label className="flex items-center"><input type="radio" name="reportHeader" value="No" onChange={handleInputChange} /> <span className="ml-1">No</span></label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium">Min Pixels for Feature/Porosity/Nodularity</label>
                <input name="minPixels" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                <span className="text-xs text-gray-500">Pixels</span>
              </div>
              <div>
                <label className="block text-sm font-medium">Circularity cutoff</label>
                <input name="circularityCutoff" type="number" step="0.01" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                <span className="text-xs text-gray-500">(&gt;0 and &lt;1)</span>
              </div>
              <div>
                <label className="block text-sm font-medium">Min Length for Nodularity</label>
                <input name="minLengthNodularity" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                <span className="text-xs text-gray-500">Pixels</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="block text-sm font-medium">Image in Report</label>
                <div className="flex gap-2">
                  <label className="flex items-center"><input type="checkbox" name="imageOriginal" onChange={handleInputChange} /> <span className="ml-1">Original</span></label>
                  <label className="flex items-center"><input type="checkbox" name="imageProcessed" onChange={handleInputChange} /> <span className="ml-1">Processed</span></label>
                  <label className="flex items-center"><input type="checkbox" name="imageBoth" onChange={handleInputChange} /> <span className="ml-1">Both</span></label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium">Dark Feature Range</label>
                <div className="flex gap-2 items-center">
                  <input name="darkFeatureFrom" type="number" className="w-20 border rounded px-2 py-1" onChange={handleInputChange} />
                  <span>To</span>
                  <input name="darkFeatureTo" type="number" className="w-20 border rounded px-2 py-1" onChange={handleInputChange} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium">Light Feature Range</label>
                <div className="flex gap-2 items-center">
                  <input name="lightFeatureFrom" type="number" className="w-20 border rounded px-2 py-1" onChange={handleInputChange} />
                  <span>To</span>
                  <input name="lightFeatureTo" type="number" className="w-20 border rounded px-2 py-1" onChange={handleInputChange} />
                </div>
              </div>
            </div>
          </div>
        );
      case 'Performance':
        return (
          <div className="space-y-4">
            <div className="text-red-600 font-semibold text-sm">PLEASE DO NOT CHANGE THE VALUES IN THIS TAB WITHOUT CONSULTING TECHNICAL SUPPORT</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium">Local Thresholding width</label>
                <input name="localThresholding" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min Pixel Length for feature</label>
                <input name="minPixelLength" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min Pixel Area for feature</label>
                <input name="minPixelArea" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Max Process Running Time</label>
                <input name="maxProcessTime" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Edge Correction value</label>
                <input name="edgeCorrection" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Blongation Cutoff</label>
                <input name="blongationCutoff" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
            </div>
            <div className="flex gap-6 items-center">
              <label className="block text-sm font-medium">Thresholding (Local/Global)</label>
              <label className="flex items-center"><input type="radio" name="thresholding" value="Local" onChange={handleInputChange} /> <span className="ml-1">Local</span></label>
              <label className="flex items-center"><input type="radio" name="thresholding" value="Global" onChange={handleInputChange} /> <span className="ml-1">Global</span></label>
              <label className="flex items-center"><input type="radio" name="thresholding" value="Binary" onChange={handleInputChange} /> <span className="ml-1">Binary</span></label>
              <label className="flex items-center"><input type="radio" name="thresholding" value="Adaptive" onChange={handleInputChange} /> <span className="ml-1">Adaptive</span></label>
            </div>
            <div className="flex gap-6 items-center">
              <label className="block text-sm font-medium">Include Global Threshold in Local?</label>
              <label className="flex items-center"><input type="radio" name="includeGlobalThreshold" value="Yes" onChange={handleInputChange} /> <span className="ml-1">Yes</span></label>
              <label className="flex items-center"><input type="radio" name="includeGlobalThreshold" value="No" onChange={handleInputChange} /> <span className="ml-1">No</span></label>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium">Sweep angle for Grain Boundary Gap fill</label>
                <input name="sweepAngle" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min Grain boundary width</label>
                <input name="minGrainBoundaryWidth" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
            </div>
          </div>
        );
      case 'Flake Configuration':
        return (
          <div className="space-y-4">
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">Rake Type Detection Order</label>
              <table className="w-full border text-xs mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">Order No</th>
                    <th className="border px-2 py-1">Element</th>
                    <th className="border px-2 py-1">Select?</th>
                  </tr>
                </thead>
                <tbody>
                  {[1,2,3,4,5].map((n) => (
                    <tr key={n}>
                      <td className="border px-2 py-1 text-center">{n}</td>
                      <td className="border px-2 py-1"><input className="w-full" name={`rakeElement${n}`} onChange={handleInputChange} /></td>
                      <td className="border px-2 py-1 text-center"><input type="checkbox" name={`rakeSelect${n}`} onChange={handleInputChange} defaultChecked /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium">Flake Angle Grouping</label>
                <input name="flakeAngleGrouping" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Flake Defect Depth Ratio Cutoff</label>
                <input name="flakeDefectDepthRatioCutoff" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Type A Min Size</label>
                <input name="typeAMinSize" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Type A Max Size</label>
                <input name="typeAMaxSize" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Type A Max Width</label>
                <input name="typeAMaxWidth" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Type B Min Size</label>
                <input name="typeBMinSize" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Type B Max Size</label>
                <input name="typeBMaxSize" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Type B Max Count</label>
                <input name="typeBMaxCount" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Max Rosette Enclosing Circle Dia</label>
                <input name="maxRosetteCircleDia" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min type B Nearest Rake Count</label>
                <input name="minTypeBNearestRakeCount" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min type B Flake Cluster Circularity</label>
                <input name="minTypeBFlakeClusterCircularity" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min type B Star Width</label>
                <input name="minTypeBStarWidth" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min type B Star Bongoation</label>
                <input name="minTypeBStarBongoation" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min Std Dev to Avg Ratio for Flake Distance</label>
                <input name="minStdDevToAvgRatio" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium">Rosette Flake Radius Factor</label>
                <input name="rosetteFlakeRadiusFactor" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Rosette Density Factor</label>
                <input name="rosetteDensityFactor" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min Rosette Flake Count</label>
                <input name="minRosetteFlakeCount" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min Rosette Star Flake Count</label>
                <input name="minRosetteStarFlakeCount" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Min Area % for Star</label>
                <input name="minAreaForStar" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Type D Flake Ratio</label>
                <input name="typeDFlakeRatio" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Flake Angle Window Size</label>
                <input name="flakeAngleWindowSize" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Flake Uniform Align Ratio</label>
                <input name="flakeUniformAlignRatio" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Max flake angle to Rosette Center</label>
                <input name="maxFlakeAngleToRosetteCenter" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Rosette Flake Ratio</label>
                <input name="rosetteFlakeRatio" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Flake Rosette Inclusion Ratio</label>
                <input name="flakeRosetteInclusionRatio" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Flake Compactness</label>
                <input name="flakeCompactness" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
              <div>
                <label className="block text-sm font-medium">Flake Cluster Percentage</label>
                <input name="flakeClusterPercentage" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
              </div>
            </div>
          </div>
        );
      case 'Chemical Properties':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Chemical Properties - Specifications (Max 8 elements)</h3>
              <table className="w-full border text-xs mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">Element</th>
                    <th className="border px-2 py-1">Spec %</th>
                    <th className="border px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {elementRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1"><input className="w-full" value={row.element} onChange={e => updateElementRow(idx, 'element', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-full" value={row.spec} onChange={e => updateElementRow(idx, 'spec', e.target.value)} /></td>
                      <td className="border px-2 py-1 text-center">
                        <button className="text-red-500 text-xs" onClick={() => removeElementRow(idx)} disabled={elementRows.length === 1}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="text-blue-600 text-xs" onClick={addElementRow} disabled={elementRows.length >= 8}>Add Element</button>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Phases - Specifications (Max 5 phases)</h3>
              <table className="w-full border text-xs mb-2">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">Element</th>
                    <th className="border px-2 py-1">Spec %</th>
                    <th className="border px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {phaseRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1"><input className="w-full" value={row.element} onChange={e => updatePhaseRow(idx, 'element', e.target.value)} /></td>
                      <td className="border px-2 py-1"><input className="w-full" value={row.spec} onChange={e => updatePhaseRow(idx, 'spec', e.target.value)} /></td>
                      <td className="border px-2 py-1 text-center">
                        <button className="text-red-500 text-xs" onClick={() => removePhaseRow(idx)} disabled={phaseRows.length === 1}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="text-blue-600 text-xs" onClick={addPhaseRow} disabled={phaseRows.length >= 5}>Add Phase</button>
            </div>
          </div>
        );
      case 'Other Properties':
        return (
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Mechanical Properties - Specifications</h3>
              <div className="grid grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium">YS (KG/mm2)</label>
                  <input name="ysMin" type="number" className="w-full border rounded px-2 py-1" placeholder="min" onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium">UTS (KG/mm2)</label>
                  <input name="utsMin" type="number" className="w-full border rounded px-2 py-1" placeholder="min" onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Elongation, %</label>
                  <input name="elongation" type="number" className="w-full border rounded px-2 py-1" placeholder="min" onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Hardness (BHN)</label>
                  <input name="hardnessMin" type="number" className="w-full border rounded px-2 py-1" placeholder="min" onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Hardness (BHN)</label>
                  <input name="hardnessMax" type="number" className="w-full border rounded px-2 py-1" placeholder="max" onChange={handleInputChange} />
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Nodularity - Specifications</h3>
              <div className="grid grid-cols-6 gap-4">
                <div>
                  <label className="block text-sm font-medium">Nodularity</label>
                  <input name="nodularity" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Nodule Count</label>
                  <input name="noduleCount" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Nodule Size</label>
                  <input name="noduleSize" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Nodule Size Range Cutoff</label>
                  <input name="noduleSizeRangeCutoff" type="number" step="0.01" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                  <span className="text-xs text-red-500">0 &lt; n &lt; 1</span>
                </div>
                <div>
                  <label className="block text-sm font-medium">Nodule/Image Boundary Ratio</label>
                  <input name="noduleImageBoundaryRatio" type="number" step="0.01" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                  <span className="text-xs text-red-500">0 &lt; n &lt; 1</span>
                </div>
                <div>
                  <label className="block text-sm font-medium">Inclusion Type A/C Gray Threshold</label>
                  <input name="inclusionTypeGrayThreshold" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                </div>
                <div>
                  <label className="block text-sm font-medium">Min Inclusion Width</label>
                  <input name="minInclusionWidth" type="number" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                  <span className="text-xs text-gray-500">μm</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Grain Size Specifications</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium">Grain Size Range Cutoff</label>
                  <input name="grainSizeRangeCutoff" type="number" step="0.01" className="w-full border rounded px-2 py-1" onChange={handleInputChange} />
                  <span className="text-xs text-red-500">0 &lt; n &lt; 1</span>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium">J Multiplier</label>
                  <table className="w-full border text-xs mb-2">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-2 py-1">Mag</th>
                        <th className="border px-2 py-1">Multiplier</th>
                        <th className="border px-2 py-1">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jMultiplierRows.map((row, idx) => (
                        <tr key={idx}>
                          <td className="border px-2 py-1"><input className="w-full" value={row.mag} onChange={e => updateJMultiplierRow(idx, 'mag', e.target.value)} /></td>
                          <td className="border px-2 py-1"><input className="w-full" value={row.multiplier} onChange={e => updateJMultiplierRow(idx, 'multiplier', e.target.value)} /></td>
                          <td className="border px-2 py-1 text-center">
                            <button className="text-red-500 text-xs" onClick={() => removeJMultiplierRow(idx)} disabled={jMultiplierRows.length === 1}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button className="text-blue-600 text-xs" onClick={addJMultiplierRow}>Add Row</button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-[1100px] max-w-full p-6 relative bg-white rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">System Configuration</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <span className="sr-only">Close</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        {tabList.map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-t-md text-sm font-medium border-b-2 transition-colors duration-200 ${
              activeTab === tab ? 'border-blue-600 text-blue-700 bg-gray-100' : 'border-transparent text-gray-500 bg-gray-50'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Tab Content */}
      <div className="mb-8 min-h-[400px] max-h-[60vh] overflow-y-auto pr-2">{renderTabContent()}</div>
      {/* Footer */}
      <div className="flex justify-end gap-3 mt-6">
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Default</button>
        <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save</button>
      </div>
    </div>
  );
};

export default SystemConfiguration; 