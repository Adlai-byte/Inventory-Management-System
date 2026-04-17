"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CategoryData,
  LowStockProduct,
  OutboundData,
  OutboundSummary,
  SummaryData,
  TopProduct,
  TopDispatchedProduct,
} from "@/components/reports/types";

const EMPTY_OUTBOUND_SUMMARY: OutboundSummary = {
  total_transfers: 0,
  total_items_dispatched: 0,
};

export function useReportsData() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("outbound");

  const [outboundData, setOutboundData] = useState<OutboundData[]>([]);
  const [outboundSummary, setOutboundSummary] = useState<OutboundSummary>(EMPTY_OUTBOUND_SUMMARY);
  const [topDispatchedProducts, setTopDispatchedProducts] = useState<TopDispatchedProduct[]>([]);
  const [outboundLoading, setOutboundLoading] = useState(false);

  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Use local timezone date (not UTC) to avoid off-by-one-day issues in UTC+8
  const localToday = new Date().toLocaleDateString("sv-SE"); // "sv-SE" gives YYYY-MM-DD in local TZ
  const localMonth = localToday.slice(0, 7);

  const [selectedPeriod, setSelectedPeriod] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(localToday);
  const [selectedMonth, setSelectedMonth] = useState(localMonth);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/reports?type=summary");
      if (res.ok) {
        const data = (await res.json()) as SummaryData;
        setSummary(data);
      }
    } catch (error) {
      console.error("Fetch summary error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOutboundData = useCallback(async () => {
    setOutboundLoading(true);
    try {
      const params = new URLSearchParams({ type: "outbound_trends", period: selectedPeriod });
      if (selectedPeriod === "daily") params.append("date", selectedDate);
      if (selectedPeriod === "monthly") params.append("month", selectedMonth);

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const result = (await res.json()) as {
          outbound?: OutboundData[];
          summary?: OutboundSummary;
          topProducts?: TopDispatchedProduct[];
        };
        setOutboundData(result.outbound || []);
        setOutboundSummary(result.summary || EMPTY_OUTBOUND_SUMMARY);
        setTopDispatchedProducts(result.topProducts || []);
      }
    } catch (error) {
      console.error("Fetch outbound data error:", error);
    } finally {
      setOutboundLoading(false);
    }
  }, [selectedDate, selectedMonth, selectedPeriod]);

  const fetchTabData = useCallback(async (tab: string) => {
    setTabLoading(true);
    try {
      const typeMap: Record<string, string> = {
        valuation: "topproducts",
        lowstock: "lowstock",
        category: "category",
      };

      const mappedType = typeMap[tab];
      if (!mappedType) return;

      const res = await fetch(`/api/reports?type=${mappedType}`);
      if (!res.ok) return;

      const data = (await res.json()) as {
        data?: TopProduct[] | LowStockProduct[] | CategoryData[];
      };

      if (tab === "valuation") setTopProducts((data.data as TopProduct[]) || []);
      if (tab === "lowstock") setLowStockProducts((data.data as LowStockProduct[]) || []);
      if (tab === "category") setCategoryData((data.data as CategoryData[]) || []);
    } catch (error) {
      console.error("Fetch tab data error:", error);
    } finally {
      setTabLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (activeTab === "outbound") {
      fetchOutboundData();
      return;
    }
    fetchTabData(activeTab);
  }, [activeTab, fetchOutboundData, fetchTabData]);

  return {
    summary,
    loading,
    activeTab,
    setActiveTab,
    outboundData,
    outboundSummary,
    topDispatchedProducts,
    outboundLoading,
    topProducts,
    lowStockProducts,
    categoryData,
    tabLoading,
    selectedPeriod,
    setSelectedPeriod,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
  };
}
