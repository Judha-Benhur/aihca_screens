import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import notesData from "../notes/notes.json";
import { useTheme } from "../theme/ThemeContext";

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TableRenderer = ({ data, headers, theme }) => {
  if (!data || data.length === 0) return null;

  return (
    <View style={[styles.table, { borderColor: theme.outline }]}>
      <View style={styles.tableRow}>
        {headers.map((header, index) => (
          <Text key={index} style={[styles.tableHeader, { backgroundColor: theme.primary, color: theme.onPrimary }]}>{header}</Text>
        ))}
      </View>
      {data.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.tableRow, { backgroundColor: rowIndex % 2 === 0 ? theme.surface : theme.card }]}>
          {headers.map((key, i) => (
            <Text key={i} style={[styles.tableCell, { color: theme.text }]}>{row[key]}</Text>
          ))}
        </View>
      ))}
    </View>
  );
};

const NotesScreen = () => {
  const [expandedNote, setExpandedNote] = useState(null);
  const { theme } = useTheme();

  const toggleNote = (title) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedNote(expandedNote === title ? null : title);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.noteContainer, { backgroundColor: theme.card }]}>
      <TouchableOpacity onPress={() => toggleNote(item.title)} style={[styles.noteHeader, { backgroundColor: theme.primary }]}>
        <Text style={[styles.noteTitle, { color: theme.onPrimary }]}>
          {item.title} {expandedNote === item.title ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>
      {expandedNote === item.title && (
        <View style={[styles.noteContent, { backgroundColor: theme.surface }]}>
          <Text style={[styles.noteText, { color: theme.text }]}>{item.content}</Text>
          <TableRenderer data={item.table1} headers={["Brahmi", "Devanagari", "IAST"]} theme={theme} />
          <TableRenderer data={item.table2} headers={["Kharosthi", "Devanagari", "IAST"]} theme={theme} />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Text style={[styles.screenTitle, { color: theme.primary }]}>Study Notes</Text>
      <FlatList
        data={notesData}
        keyExtractor={(item) => item.title}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40, color: theme.text }}>
            No notes available.
          </Text>
        }
        contentContainerStyle={styles.container}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 50,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  container: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  noteContainer: {
    marginBottom: 12,
    borderRadius: 10,
    elevation: 2,
    overflow: "hidden",
  },
  noteHeader: {
    padding: 16,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  noteContent: {
    padding: 16,
  },
  noteText: {
    fontSize: 14,
    marginBottom: 10,
  },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 6,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeader: {
    flex: 1,
    padding: 10,
    textAlign: "center",
    fontWeight: "bold",
  },
  tableCell: {
    flex: 1,
    padding: 10,
    textAlign: "center",
    fontSize: 13,
  },
});

export default NotesScreen;
