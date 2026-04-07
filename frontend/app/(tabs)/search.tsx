import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { MealCard } from '@/components/MealCard';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { api } from '@/lib/api';
import type { Meal } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function stripTime(d: Date): Date {
  const c = new Date(d); c.setHours(0,0,0,0); return c;
}

interface RangeCalendarProps {
  fromDate: Date | null;
  toDate: Date | null;
  onSelect: (date: Date) => void;
  primaryColor: string;
  textColor: string;
}

// Tracks selection step: first tap = from, second tap = to
function RangeCalendar({ fromDate, toDate, onSelect, primaryColor, textColor }: RangeCalendarProps): React.JSX.Element {
  const today = new Date();
  const initDate = fromDate ?? today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const prevMonth = (): void => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = (): void => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const from = fromDate ? stripTime(fromDate) : null;
  const to = toDate ? stripTime(toDate) : null;

  return (
    <View style={{ paddingHorizontal: 8 }}>
      <View style={calStyles.navRow}>
        <Pressable onPress={prevMonth} style={calStyles.navBtn}>
          <Text variant="h2" style={{ color: primaryColor }}>‹</Text>
        </Pressable>
        <Text variant="h2" style={{ color: textColor }}>{MONTHS[viewMonth]} {viewYear}</Text>
        <Pressable onPress={nextMonth} style={calStyles.navBtn}>
          <Text variant="h2" style={{ color: primaryColor }}>›</Text>
        </Pressable>
      </View>

      <View style={calStyles.weekRow}>
        {DAYS.map(d => (
          <View key={d} style={calStyles.cell}>
            <Text variant="caption" style={{ color: `${textColor}55`, fontSize: 11 }}>{d}</Text>
          </View>
        ))}
      </View>

      {rows.map((row, ri) => (
        <View key={ri} style={calStyles.weekRow}>
          {Array.from({ length: 7 }, (_, ci) => {
            const day = row[ci] ?? null;
            if (day === null) return <View key={ci} style={calStyles.cell} />;

            const cellDate = stripTime(new Date(viewYear, viewMonth, day));
            const isFuture = cellDate > stripTime(today);
            const isFrom = from != null && sameDay(cellDate, from);
            const isTo = to != null && sameDay(cellDate, to);
            const isInRange = from != null && to != null && cellDate > from && cellDate < to;
            const isToday = sameDay(cellDate, today);
            const isEndpoint = isFrom || isTo;

            return (
              <Pressable
                key={ci}
                style={[calStyles.cell, isInRange && { backgroundColor: `${primaryColor}22` }]}
                onPress={() => { if (!isFuture) onSelect(cellDate); }}
                disabled={isFuture}
              >
                <View style={[calStyles.dayCircle, isEndpoint && { backgroundColor: primaryColor }]}>
                  <Text
                    variant="body"
                    style={{
                      color: isEndpoint ? '#fff' : isFuture ? `${textColor}25` : isToday ? primaryColor : textColor,
                      fontWeight: isEndpoint || isToday ? '700' : '400',
                      fontSize: 14,
                    }}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const calStyles = StyleSheet.create({
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  navBtn: { padding: 8 },
  weekRow: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

export default function SearchScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Meal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // step: 'from' = waiting for first tap, 'to' = waiting for second tap
  const [step, setStep] = useState<'from' | 'to'>('from');

  const toISODate = (d: Date): string => d.toISOString().split('T')[0];

  const search = useCallback(async (q: string, from: Date | null, to: Date | null) => {
    setIsLoading(true);
    setError(null);
    try {
      if (q.trim().length > 0) {
        const data = await api.searchMeals(q.trim());
        setResults(data);
      } else {
        const data = await api.getMeals(
          0, 500,
          from ? toISODate(from) : undefined,
          to ? toISODate(to) : undefined,
        );
        setResults(data.meals);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (query.trim().length === 0 && !fromDate && !toDate) { setResults([]); return; }
    if (debounceTimer.current !== null) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { void search(query, fromDate, toDate); }, 300);
    return () => { if (debounceTimer.current !== null) clearTimeout(debounceTimer.current); };
  }, [query, fromDate, toDate, search]);

  const filteredResults = results;

  const handleDayPress = (date: Date): void => {
    if (step === 'from') {
      setFromDate(date);
      setToDate(null);
      setStep('to');
    } else {
      // Ensure from <= to
      if (fromDate && date < fromDate) {
        setFromDate(date);
        setToDate(fromDate);
      } else {
        setToDate(date);
      }
      setStep('from');
      setCalendarOpen(false);
    }
  };

  const openCalendar = (): void => {
    setStep('from');
    setCalendarOpen(true);
  };

  const hasDateFilter = fromDate !== null || toDate !== null;
  const showResults = query.trim().length > 0 || hasDateFilter;

  const dateLabel = hasDateFilter
    ? fromDate && toDate
      ? `${formatDate(fromDate)} – ${formatDate(toDate)}`
      : fromDate
        ? `From ${formatDate(fromDate)}`
        : `To ${formatDate(toDate!)}`
    : null;

  return (
    <Screen padding={false}>
      <View style={[styles.searchContainer, { paddingHorizontal: theme.spacing.md, paddingTop: 16 }]}>
        <Text variant="h1" style={[styles.title, { color: theme.colors.text }]}>SEARCH</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search meals, restaurants..."
          placeholderTextColor={`${theme.colors.text}55`}
          style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />

        <View style={styles.dateRow}>
          <Pressable
            onPress={openCalendar}
            style={[styles.dateBtn, { backgroundColor: theme.colors.card, borderColor: hasDateFilter ? theme.colors.primary : theme.colors.border, borderWidth: hasDateFilter ? 1.5 : 1, flex: 1 }]}
          >
            <Text variant="caption" style={{ color: hasDateFilter ? theme.colors.primary : `${theme.colors.text}66` }}>
              {dateLabel ?? '📅 Filter by date'}
            </Text>
          </Pressable>
          {hasDateFilter && (
            <Pressable onPress={() => { setFromDate(null); setToDate(null); }} style={styles.clearBtn}>
              <Text variant="caption" style={{ color: theme.colors.secondary }}>Clear</Text>
            </Pressable>
          )}
        </View>
      </View>

      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => { setCalendarOpen(false); }}>
        <Pressable style={styles.overlay} onPress={() => { setCalendarOpen(false); }}>
          <Pressable style={[styles.calendarBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.calHeader, { borderBottomColor: theme.colors.border }]}>
              <Text variant="body" style={{ color: theme.colors.text, fontWeight: '600' }}>
                {step === 'from' ? 'Tap start date' : 'Tap end date'}
              </Text>
              <Pressable onPress={() => { setCalendarOpen(false); }}>
                <Text variant="body" style={{ color: theme.colors.secondary }}>✕</Text>
              </Pressable>
            </View>
            {/* Range summary */}
            <View style={[styles.rangeSummary, { borderBottomColor: theme.colors.border }]}>
              <Text variant="caption" style={{ color: step === 'from' ? theme.colors.primary : `${theme.colors.text}55`, fontWeight: step === 'from' ? '700' : '400' }}>
                From: {fromDate ? formatDate(fromDate) : '—'}
              </Text>
              <Text variant="caption" style={{ color: `${theme.colors.text}44` }}>→</Text>
              <Text variant="caption" style={{ color: step === 'to' ? theme.colors.primary : `${theme.colors.text}55`, fontWeight: step === 'to' ? '700' : '400' }}>
                To: {toDate ? formatDate(toDate) : '—'}
              </Text>
            </View>
            <RangeCalendar
              fromDate={fromDate}
              toDate={toDate}
              onSelect={handleDayPress}
              primaryColor={theme.colors.primary}
              textColor={theme.colors.text}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {isLoading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : error !== null ? (
        <View style={styles.centered}><Text variant="body" style={{ color: `${theme.colors.text}88` }}>{error}</Text></View>
      ) : !showResults ? (
        <View style={styles.centered}><Text variant="body" style={{ color: `${theme.colors.text}55` }}>Type to search your food journal</Text></View>
      ) : (
        <FlatList<Meal>
          data={filteredResults}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <MealCard meal={item} />}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: theme.spacing.md }]}
          ListEmptyComponent={<View style={styles.centered}><Text variant="body" style={{ color: `${theme.colors.text}88` }}>No results found</Text></View>}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchContainer: { paddingBottom: 12 },
  title: { letterSpacing: 2, marginBottom: 12 },
  input: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, fontSize: 16, marginBottom: 10 },
  dateRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dateBtn: { height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  calendarBox: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden', paddingBottom: 12 },
  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  rangeSummary: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1 },
  listContent: { paddingTop: 8, paddingBottom: 24, flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
});
