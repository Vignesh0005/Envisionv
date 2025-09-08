import React, { useState, useEffect, useRef } from 'react';
import { Button, Select, Input, Radio, Tabs, Space, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TabPane } = Tabs;
const { Option } = Select;

const inclusionColors = {
  A: 'bg-purple-400',
  B: 'bg-blue-400',
  C: 'bg-green-400',
  D: 'bg-pink-400',
  Oversize: 'bg-red-500',
};

const InclusionAnalysis = ({ imagePath, imageUrl, onClose }) => {
  const [methodTab, setMethodTab] = useState('methodA');
  const [method, setMethod] = useState('default');
  const [specimenNumber, setSpecimenNumber] = useState(1);
  const [fieldArea, setFieldArea] = useState(0.512);
  const [imageArea, setImageArea] = useState(0.512);
  const [interval, setInterval] = useState(0.5);
  const [source, setSource] = useState('image');
  const [imagePrep, setImagePrep] = useState('');
  const [config, setConfig] = useState('Default');
  const [inclusionTypes, setInclusionTypes] = useState({
    A: { thin: false, thick: false },
    B: { thin: false, thick: false },
    C: { thin: false, thick: false },
    D: { thin: false, thick: false },
    NONE: { none: false },
  });
  const [inclusionData, setInclusionData] = useState({
    unit: 'Microns',
    length: '',
    width: '',
    aspect: '',
    suox: '',
    angle: '',
  });
  const [cutoffFrom, setCutoffFrom] = useState('');
  const [cutoffTo, setCutoffTo] = useState('');
  const [oversizeFilter, setOversizeFilter] = useState('All');
  const [oversizeRows, setOversizeRows] = useState([]);
  const [currentResults, setCurrentResults] = useState({
    A: { thin: 0, thick: 0 },
    B: { thin: 0, thick: 0 },
    C: { thin: 0, thick: 0 },
    D: { thin: 0, thick: 0 },
  });
  const [summaryResults, setSummaryResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bottomTab, setBottomTab] = useState('regular');
  const [displayUrl, setDisplayUrl] = useState(null);
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    console.log('InclusionAnalysis: Component mounted with props:', {
      imagePath, imageUrl, hasImagePath: !!imagePath, hasImageUrl: !!imageUrl
    });
    
    // Determine the correct URL to use
    let finalUrl = null;
    
    if (imageUrl) {
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        console.log('InclusionAnalysis: Using provided HTTP imageUrl:', imageUrl);
        finalUrl = imageUrl;
      } else if (imagePath) {
        console.log('InclusionAnalysis: Constructing HTTP URL from imagePath:', imagePath);
        finalUrl = `http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`;
      }
    } else if (imagePath) {
      console.log('InclusionAnalysis: No imageUrl, constructing from imagePath:', imagePath);
      finalUrl = `http://localhost:5000/api/get-image?path=${encodeURIComponent(imagePath)}`;
    }
    
    console.log('InclusionAnalysis: Final URL to use:', finalUrl);
    setDisplayUrl(finalUrl);
    
    if (finalUrl) {
      loadImage(finalUrl);
    }
  }, [imageUrl, imagePath]);

  const loadImage = (url) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
      }
    };
    img.onerror = (error) => {
      message.error('Failed to load image');
    };
    img.src = url;
  };

  const handleInclusionTypeChange = (type, thickness, checked) => {
    setInclusionTypes((prev) => ({
      ...prev,
      [type]: { ...prev[type], [thickness]: checked },
    }));
  };

  const handleFindInclusion = async () => {
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:5000/api/analyze-inclusion', {
        image_path: imagePath,
        method,
        specimen_number: specimenNumber,
        field_area: fieldArea,
        inclusion_types: inclusionTypes,
      });
      if (response.data.status === 'success') {
        setCurrentResults(response.data.results);
        message.success('Analysis completed successfully');
      } else {
        message.error(response.data.message || 'Analysis failed');
      }
    } catch (error) {
      message.error('Failed to analyze inclusions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToSummary = () => {
    setSummaryResults((prev) => [
      ...prev,
      { specimen: specimenNumber, ...currentResults },
    ]);
  };

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-50">
      {/* Header Bar */}
      <div className="flex items-center px-4 py-2 border-b bg-gray-100">
        <button onClick={onClose} className="flex items-center gap-2 px-2 py-1 text-gray-600 hover:bg-gray-200 rounded transition-colors">
          <ArrowLeftOutlined />
          <span>Close</span>
        </button>
        <span className="ml-4 font-semibold text-lg">Inclusion Analysis</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="small">Get Image</Button>
          <span className="text-xs">Image Area</span>
          <Input size="small" value={imageArea} className="w-16 mx-1" readOnly />
          <span className="text-xs">mm²</span>
          <span className="ml-2 text-xs">Source:</span>
          <Select size="small" value={source} onChange={setSource} className="w-20">
            <Option value="video">Video</Option>
            <Option value="image">Image</Option>
          </Select>
          <span className="ml-2 text-xs">Interval</span>
          <Input size="small" value={interval} onChange={e => setInterval(e.target.value)} className="w-12 mx-1" />
          <Button size="small">Reset</Button>
        </div>
      </div>

      {/* Method Tabs */}
      <div className="border-b bg-white px-4 pt-2">
        <Tabs activeKey={methodTab} onChange={setMethodTab} size="small">
          <TabPane tab="Method A/Method D" key="methodA" />
          <TabPane tab="Method C (Oxide & Silicate)" key="methodC" />
          <TabPane tab="Configuration" key="config" />
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-row gap-2 p-4 overflow-auto">
        {/* Left Controls */}
        <div className="w-72 flex flex-col gap-2">
          <div className="bg-white border rounded p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs">Image Preparation</span>
              <Select size="small" value={imagePrep} onChange={setImagePrep} className="w-24">
                <Option value="">Select</Option>
                <Option value="prep1">Prep 1</Option>
                <Option value="prep2">Prep 2</Option>
              </Select>
              <Button size="small">Run</Button>
              <span className="text-xs text-red-500">(Optional)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs">Configuration</span>
              <Select size="small" value={config} onChange={setConfig} className="w-24">
                <Option value="Default">Default</Option>
                <Option value="Config1">Config 1</Option>
              </Select>
              <Button size="small">Find Inclusion</Button>
            </div>
          </div>
          <div className="bg-white border rounded p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs">Specimen Number</span>
              <Select size="small" value={specimenNumber} onChange={setSpecimenNumber} className="w-16">
                {[...Array(9)].map((_, i) => (
                  <Option key={i + 1} value={i + 1}>{i + 1}</Option>
                ))}
              </Select>
              <span className="font-semibold text-xs ml-2">Field Area</span>
              <Input size="small" value={fieldArea} onChange={e => setFieldArea(e.target.value)} className="w-16" />
              <span className="text-xs">mm²</span>
            </div>
          </div>
          <div className="bg-white border rounded p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs">Cut-off range</span>
              <Input size="small" value={cutoffFrom} onChange={e => setCutoffFrom(e.target.value)} className="w-12" placeholder="From" />
              <span>-</span>
              <Input size="small" value={cutoffTo} onChange={e => setCutoffTo(e.target.value)} className="w-12" placeholder="To" />
            </div>
          </div>
          <div className="bg-white border rounded p-3 flex flex-col gap-2">
            <div className="font-semibold text-xs mb-1">Over Sized</div>
            <div className="flex gap-1 mb-1">
              {['A', 'B', 'C', 'D', 'E', 'All'].map(f => (
                <Button key={f} size="small" type={oversizeFilter === f ? 'primary' : 'default'} onClick={() => setOversizeFilter(f)}>{f}</Button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border px-2 py-1">Id</th>
                    <th className="border px-2 py-1">Type</th>
                    <th className="border px-2 py-1">Width</th>
                    <th className="border px-2 py-1">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {oversizeRows.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-gray-400">No data</td></tr>
                  ) : (
                    oversizeRows.map((row, i) => (
                      <tr key={i}>
                        <td className="border px-2 py-1">{row.id}</td>
                        <td className="border px-2 py-1">{row.type}</td>
                        <td className="border px-2 py-1">{row.width}</td>
                        <td className="border px-2 py-1">{row.length}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Center Image and Inclusion Type Controls */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex gap-2">
            {/* Image Display */}
            <div className="flex-1 bg-white border rounded p-2 flex flex-col">
              <canvas ref={canvasRef} className="w-full h-64 object-contain border" />
            </div>
            {/* Set Inclusion Type & Data */}
            <div className="w-64 bg-white border rounded p-3 flex flex-col gap-2">
              <div className="font-semibold text-xs mb-1">Set Inclusion Type</div>
              {['A', 'B', 'C', 'D'].map(type => (
                <div key={type} className="flex items-center gap-2 mb-1">
                  <span className={`w-10 text-xs font-semibold ${inclusionColors[type]}`}>Type {type}</span>
                  <Radio checked={inclusionTypes[type].thin} onChange={e => handleInclusionTypeChange(type, 'thin', e.target.checked)}>Thin</Radio>
                  <Radio checked={inclusionTypes[type].thick} onChange={e => handleInclusionTypeChange(type, 'thick', e.target.checked)}>Thick</Radio>
                </div>
              ))}
              <div className="flex items-center gap-2 mb-1">
                <span className="w-10 text-xs font-semibold">NONE</span>
                <Radio checked={inclusionTypes.NONE.none} onChange={e => setInclusionTypes(prev => ({ ...prev, NONE: { none: e.target.checked } }))}>None</Radio>
              </div>
              <div className="font-semibold text-xs mt-2 mb-1">Inclusion Data</div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-12 text-xs">Unit</span>
                <span className="text-xs text-red-600">Microns</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-12 text-xs">Length</span>
                <Input size="small" value={inclusionData.length} onChange={e => setInclusionData({ ...inclusionData, length: e.target.value })} className="w-20" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-12 text-xs">Width</span>
                <Input size="small" value={inclusionData.width} onChange={e => setInclusionData({ ...inclusionData, width: e.target.value })} className="w-20" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-12 text-xs">Aspect Ratio</span>
                <Input size="small" value={inclusionData.aspect} onChange={e => setInclusionData({ ...inclusionData, aspect: e.target.value })} className="w-20" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-12 text-xs">Su/Ox</span>
                <Input size="small" value={inclusionData.suox} onChange={e => setInclusionData({ ...inclusionData, suox: e.target.value })} className="w-20" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-12 text-xs">Angle/Axis</span>
                <Input size="small" value={inclusionData.angle} onChange={e => setInclusionData({ ...inclusionData, angle: e.target.value })} className="w-20" />
              </div>
            </div>
          </div>
          {/* Current Result Table */}
          <div className="bg-white border rounded p-3 mt-2">
            <div className="font-semibold text-xs mb-1">Current Result</div>
            <table className="w-full text-xs border mb-2">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">Type</th>
                  <th className="border px-2 py-1">Thin</th>
                  <th className="border px-2 py-1">Thick</th>
                </tr>
              </thead>
              <tbody>
                {['A', 'B', 'C', 'D'].map(type => (
                  <tr key={type}>
                    <td className="border px-2 py-1">{`Type ${type}`}</td>
                    <td className="border px-2 py-1">{currentResults[type].thin}</td>
                    <td className="border px-2 py-1">{currentResults[type].thick}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button size="small" onClick={handleAddToSummary}>Add</Button>
          </div>
          {/* Color Legend */}
          <div className="flex gap-2 mt-2">
            {Object.entries(inclusionColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <span className={`inline-block w-4 h-4 rounded ${color}`}></span>
                <span className="text-xs">{type === 'Oversize' ? 'Oversize' : `Type ${type}`}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right Spacer */}
        <div className="w-2" />
      </div>
      {/* Bottom Tabs */}
      <div className="border-t bg-white px-4 pt-2 pb-4">
        <Tabs activeKey={bottomTab} onChange={setBottomTab} size="small">
          <TabPane tab="Regular Inclusions" key="regular">
            <div className="text-xs text-gray-500 p-2">Regular Inclusions Table (to be implemented)</div>
          </TabPane>
          <TabPane tab="Over Sized" key="oversized">
            <div className="text-xs text-gray-500 p-2">Over Sized Table (to be implemented)</div>
          </TabPane>
          <TabPane tab="Method D Result" key="methodD">
            <div className="text-xs text-gray-500 p-2">Method D Result Table (to be implemented)</div>
          </TabPane>
          <TabPane tab="Summary Data" key="summary">
            <div className="text-xs text-gray-500 p-2">Summary Data Table (to be implemented)</div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default InclusionAnalysis; 