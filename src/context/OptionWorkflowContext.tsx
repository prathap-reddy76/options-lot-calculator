'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { InstrumentId, SelectedContract } from '@/types/market';
import { INSTRUMENTS_DEFINITIONS } from '@/lib/constants';

export type WorkflowMode = 'CHAIN' | 'MANUAL';

interface OptionWorkflowContextType {
  selectedInstrumentId: InstrumentId;
  selectedExpiry: string | null;
  selectedCeContract: SelectedContract | null;
  selectedPeContract: SelectedContract | null;
  totalCapital: number | null;
  ceAllocationPercent: number;
  peAllocationPercent: number;
  chargesEnabled: boolean;
  estimatedChargePerLot: number | null;
  workflowMode: WorkflowMode;
  canContinue: boolean;
  validationErrors: {
    ce?: string;
    pe?: string;
    capital?: string;
  };
  // Actions
  selectMarket: (id: InstrumentId) => void;
  selectExpiry: (expiry: string) => void;
  selectCeContract: (contract: SelectedContract | null) => void;
  selectPeContract: (contract: SelectedContract | null) => void;
  setTotalCapital: (amount: number | null) => void;
  setCeAllocation: (percent: number) => void;
  setPeAllocation: (percent: number) => void;
  setCharges: (enabled: boolean, amount?: number | null) => void;
  setWorkflowMode: (mode: WorkflowMode) => void;
  resetAllocation: () => void;
  startAgain: () => void;
  loadExampleContracts: () => void;
  updateCeManual: (updates: Partial<SelectedContract>) => void;
  updatePeManual: (updates: Partial<SelectedContract>) => void;
}

const STORAGE_KEY = 'options_lot_calc_workflow_v1';

const OptionWorkflowContext = createContext<OptionWorkflowContextType | null>(null);

export const OptionWorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<InstrumentId>('NIFTY_50');
  const [selectedExpiry, setSelectedExpiry] = useState<string | null>('2026-10-29');
  const [selectedCeContract, setSelectedCeContract] = useState<SelectedContract | null>(null);
  const [selectedPeContract, setSelectedPeContract] = useState<SelectedContract | null>(null);
  const [totalCapital, setTotalCapitalState] = useState<number | null>(200000);
  const [ceAllocationPercent, setCeAllocationState] = useState<number>(50);
  const [chargesEnabled, setChargesEnabled] = useState<boolean>(false);
  const [estimatedChargePerLot, setEstimatedChargePerLot] = useState<number | null>(20);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('CHAIN');
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Safe SSR hydration from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedInstrumentId && INSTRUMENTS_DEFINITIONS[parsed.selectedInstrumentId as InstrumentId]) {
          setSelectedInstrumentId(parsed.selectedInstrumentId);
        }
        if (parsed.selectedExpiry !== undefined) setSelectedExpiry(parsed.selectedExpiry);
        if (parsed.selectedCeContract) setSelectedCeContract(parsed.selectedCeContract);
        if (parsed.selectedPeContract) setSelectedPeContract(parsed.selectedPeContract);
        if (parsed.totalCapital !== undefined) setTotalCapitalState(parsed.totalCapital);
        if (typeof parsed.ceAllocationPercent === 'number') setCeAllocationState(parsed.ceAllocationPercent);
        if (typeof parsed.chargesEnabled === 'boolean') setChargesEnabled(parsed.chargesEnabled);
        if (parsed.estimatedChargePerLot !== undefined) setEstimatedChargePerLot(parsed.estimatedChargePerLot);
        if (parsed.workflowMode) setWorkflowMode(parsed.workflowMode);
      }
    } catch {
      // sessionStorage unavailable or parse error — fallback to defaults
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Save state updates to sessionStorage
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const payload = {
        selectedInstrumentId,
        selectedExpiry,
        selectedCeContract,
        selectedPeContract,
        totalCapital,
        ceAllocationPercent,
        chargesEnabled,
        estimatedChargePerLot,
        workflowMode,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore sessionStorage quota or restriction errors
    }
  }, [
    isHydrated,
    selectedInstrumentId,
    selectedExpiry,
    selectedCeContract,
    selectedPeContract,
    totalCapital,
    ceAllocationPercent,
    chargesEnabled,
    estimatedChargePerLot,
    workflowMode,
  ]);

  const peAllocationPercent = useMemo(() => {
    return 100 - ceAllocationPercent;
  }, [ceAllocationPercent]);

  /**
   * Market Selection: Changing selected market clears incompatible contracts & expiries.
   */
  const selectMarket = useCallback((id: InstrumentId) => {
    const inst = INSTRUMENTS_DEFINITIONS[id];
    setSelectedInstrumentId(id);
    setSelectedExpiry('2026-10-29'); // Initialize to standard reference expiry
    setSelectedCeContract(null); // Clear incompatible CE contract
    setSelectedPeContract(null); // Clear incompatible PE contract
  }, []);

  /**
   * Expiry Selection: Changing expiry clears strikes that do not belong to that expiry.
   */
  const selectExpiry = useCallback((expiry: string) => {
    setSelectedExpiry(expiry);
    setSelectedCeContract((prev) => (prev ? { ...prev, expiryDate: expiry, strikePrice: 0, premium: null } : null));
    setSelectedPeContract((prev) => (prev ? { ...prev, expiryDate: expiry, strikePrice: 0, premium: null } : null));
  }, []);

  /**
   * Independent CE Selection
   */
  const selectCeContract = useCallback((contract: SelectedContract | null) => {
    setSelectedCeContract(contract);
    if (contract?.expiryDate) {
      setSelectedExpiry(contract.expiryDate);
    }
  }, []);

  /**
   * Independent PE Selection
   */
  const selectPeContract = useCallback((contract: SelectedContract | null) => {
    setSelectedPeContract(contract);
    if (contract?.expiryDate) {
      setSelectedExpiry(contract.expiryDate);
    }
  }, []);

  const setTotalCapital = useCallback((amount: number | null) => {
    setTotalCapitalState(amount !== null && !isNaN(amount) ? Math.max(0, amount) : null);
  }, []);

  /**
   * CE Allocation change: Automatically updates PE to ensure 100% total.
   */
  const setCeAllocation = useCallback((percent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
    setCeAllocationState(clamped);
  }, []);

  /**
   * PE Allocation change: Automatically updates CE to ensure 100% total.
   */
  const setPeAllocation = useCallback((percent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
    setCeAllocationState(100 - clamped);
  }, []);

  const setCharges = useCallback((enabled: boolean, amount?: number | null) => {
    setChargesEnabled(enabled);
    if (amount !== undefined) {
      setEstimatedChargePerLot(amount);
    }
  }, []);

  const resetAllocation = useCallback(() => {
    setCeAllocationState(50);
  }, []);

  const startAgain = useCallback(() => {
    const inst = INSTRUMENTS_DEFINITIONS['NIFTY_50'];
    setSelectedInstrumentId('NIFTY_50');
    setSelectedExpiry(null);
    setSelectedCeContract(null);
    setSelectedPeContract(null);
    setTotalCapitalState(200000);
    setCeAllocationState(50);
    setChargesEnabled(false);
    setWorkflowMode('CHAIN');
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  /**
   * Load the verified prompt example values for testing and immediate calculation
   */
  const loadExampleContracts = useCallback(() => {
    const inst = INSTRUMENTS_DEFINITIONS['NIFTY_50'];
    const expiry = '2026-10-29';

    setSelectedInstrumentId('NIFTY_50');
    setSelectedExpiry(expiry);

    setSelectedCeContract({
      exchange: 'NSE',
      underlyingSymbol: 'NIFTY',
      expiryDate: expiry,
      strikePrice: 24500,
      optionType: 'CE',
      premium: 40,
      lotSize: 65,
      contractIdentifier: 'NSE:NIFTY26OCT24500CE',
      source: 'MANUAL',
      quoteState: 'NOT_CONNECTED',
    });

    setSelectedPeContract({
      exchange: 'NSE',
      underlyingSymbol: 'NIFTY',
      expiryDate: expiry,
      strikePrice: 24500,
      optionType: 'PE',
      premium: 60,
      lotSize: 65,
      contractIdentifier: 'NSE:NIFTY26OCT24500PE',
      source: 'MANUAL',
      quoteState: 'NOT_CONNECTED',
    });

    setTotalCapitalState(200000);
    setCeAllocationState(50);
    setChargesEnabled(false);
  }, []);

  const updateCeManual = useCallback((updates: Partial<SelectedContract>) => {
    setSelectedCeContract((prev) => {
      const inst = INSTRUMENTS_DEFINITIONS[selectedInstrumentId];
      const base: SelectedContract = prev || {
        exchange: inst.exchange,
        underlyingSymbol: inst.symbol,
        expiryDate: selectedExpiry || '',
        strikePrice: 0,
        optionType: 'CE',
        lotSize: inst.defaultLotSize,
        premium: null,
        source: 'MANUAL',
      };
      return { ...base, ...updates, source: 'MANUAL' };
    });
  }, [selectedInstrumentId, selectedExpiry]);

  const updatePeManual = useCallback((updates: Partial<SelectedContract>) => {
    setSelectedPeContract((prev) => {
      const inst = INSTRUMENTS_DEFINITIONS[selectedInstrumentId];
      const base: SelectedContract = prev || {
        exchange: inst.exchange,
        underlyingSymbol: inst.symbol,
        expiryDate: selectedExpiry || '',
        strikePrice: 0,
        optionType: 'PE',
        lotSize: inst.defaultLotSize,
        premium: null,
        source: 'MANUAL',
      };
      return { ...base, ...updates, source: 'MANUAL' };
    });
  }, [selectedInstrumentId, selectedExpiry]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: { ce?: string; pe?: string; capital?: string } = {};

    if (!selectedCeContract || !selectedCeContract.strikePrice || selectedCeContract.strikePrice <= 0) {
      errors.ce = 'Please select a CE contract.';
    } else if (selectedCeContract.premium === null || selectedCeContract.premium === undefined || selectedCeContract.premium <= 0) {
      errors.ce = 'CE premium must be greater than ₹0.';
    } else if (!selectedCeContract.lotSize || selectedCeContract.lotSize <= 0) {
      errors.ce = 'CE lot size must be specified.';
    }

    if (!selectedPeContract || !selectedPeContract.strikePrice || selectedPeContract.strikePrice <= 0) {
      errors.pe = 'Please select a PE contract.';
    } else if (selectedPeContract.premium === null || selectedPeContract.premium === undefined || selectedPeContract.premium <= 0) {
      errors.pe = 'PE premium must be greater than ₹0.';
    } else if (!selectedPeContract.lotSize || selectedPeContract.lotSize <= 0) {
      errors.pe = 'PE lot size must be specified.';
    }

    if (totalCapital === null || totalCapital === undefined || totalCapital <= 0) {
      errors.capital = 'Total capital must be greater than ₹0.';
    }

    return errors;
  }, [selectedCeContract, selectedPeContract, totalCapital]);

  const canContinue = useMemo(() => {
    const isCeValid = Boolean(
      selectedCeContract &&
      selectedCeContract.strikePrice > 0 &&
      selectedCeContract.premium != null &&
      selectedCeContract.premium > 0 &&
      selectedCeContract.lotSize != null &&
      selectedCeContract.lotSize > 0
    );

    const isPeValid = Boolean(
      selectedPeContract &&
      selectedPeContract.strikePrice > 0 &&
      selectedPeContract.premium != null &&
      selectedPeContract.premium > 0 &&
      selectedPeContract.lotSize != null &&
      selectedPeContract.lotSize > 0
    );

    return isCeValid && isPeValid;
  }, [selectedCeContract, selectedPeContract]);

  const value = {
    selectedInstrumentId,
    selectedExpiry,
    selectedCeContract,
    selectedPeContract,
    totalCapital,
    ceAllocationPercent,
    peAllocationPercent,
    chargesEnabled,
    estimatedChargePerLot,
    workflowMode,
    canContinue,
    validationErrors,
    selectMarket,
    selectExpiry,
    selectCeContract,
    selectPeContract,
    setTotalCapital,
    setCeAllocation,
    setPeAllocation,
    setCharges,
    setWorkflowMode,
    resetAllocation,
    startAgain,
    loadExampleContracts,
    updateCeManual,
    updatePeManual,
  };

  return (
    <OptionWorkflowContext.Provider value={value}>
      {children}
    </OptionWorkflowContext.Provider>
  );
};

export const useOptionWorkflow = (): OptionWorkflowContextType => {
  const context = useContext(OptionWorkflowContext);
  if (!context) {
    throw new Error('useOptionWorkflow must be used within an OptionWorkflowProvider');
  }
  return context;
};
