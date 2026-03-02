import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '@/services/supabase';

interface DietPlan {
    id: string;
    plan_name: string;
    description: string | null;
    nutrition_goal: string | null;
    plan_data: any;
}

interface DietAssignment {
    id: string;
    nutrition_plan_id: string;
    sender_id: string;
    status: string;
    message: string | null;
    created_at: string;
}

export default function DietInvitationScreen() {
    const { planId } = useLocalSearchParams<{ planId: string }>();
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
    const [assignment, setAssignment] = useState<DietAssignment | null>(null);
    const [plan, setPlan] = useState<DietPlan | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    useEffect(() => {
        if (planId && user?.id) {
            loadAssignment();
        }
    }, [planId, user?.id]);

    const loadAssignment = async () => {
        setLoading(true);
        try {
            // Get the assignment record
            const { data: assignmentData } = await supabase
                .from('shared_nutrition_plans')
                .select('*')
                .eq('nutrition_plan_id', planId)
                .eq('receiver_id', user?.id)
                .maybeSingle();

            if (assignmentData) {
                setAssignment(assignmentData);
            }

            // Get the plan details
            const { data: planData } = await supabase
                .from('nutrition_plans')
                .select('id, plan_name, description, nutrition_goal, plan_data')
                .eq('id', planId)
                .maybeSingle();

            if (planData) {
                setPlan(planData);
            }
        } catch (err) {
            console.error('Error loading diet invitation:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = () => {
        Alert.alert(
            '¿Activar como plan actual?',
            'Si aceptas, este plan de nutrición se convertirá en tu plan activo.',
            [
                { text: 'Solo Aceptar', onPress: () => acceptDiet(false) },
                { text: 'Aceptar y Activar', onPress: () => acceptDiet(true), style: 'default' },
                { text: 'Cancelar', style: 'cancel' },
            ]
        );
    };

    const acceptDiet = async (activate: boolean) => {
        if (!assignment || !user?.id) return;
        setAccepting(true);
        try {
            // Update assignment status
            await supabase
                .from('shared_nutrition_plans')
                .update({ status: 'accepted', updated_at: new Date().toISOString() })
                .eq('id', assignment.id);

            if (activate && planId) {
                // Deactivate current active plan
                await supabase
                    .from('nutrition_plans')
                    .update({ is_active: false })
                    .eq('user_id', user.id)
                    .eq('is_active', true);

                // Activate this plan
                await supabase
                    .from('nutrition_plans')
                    .update({ is_active: true, activated_at: new Date().toISOString() })
                    .eq('id', planId);
            }

            Alert.alert(
                '✅ Dieta aceptada',
                activate ? 'El plan se ha activado como tu plan actual.' : 'El plan se ha guardado en tus planes.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (err) {
            console.error('Error accepting diet:', err);
            Alert.alert('Error', 'No se pudo aceptar la dieta.');
        } finally {
            setAccepting(false);
        }
    };

    const handleReject = () => {
        Alert.alert(
            'Rechazar dieta',
            '¿Estás seguro de que quieres rechazar esta dieta?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Rechazar', style: 'destructive', onPress: async () => {
                        if (!assignment) return;
                        setRejecting(true);
                        try {
                            await supabase
                                .from('shared_nutrition_plans')
                                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                                .eq('id', assignment.id);
                            Alert.alert('Dieta rechazada', '', [{ text: 'OK', onPress: () => router.back() }]);
                        } catch (err) {
                            console.error('Error rejecting diet:', err);
                            Alert.alert('Error', 'No se pudo rechazar la dieta.');
                        } finally {
                            setRejecting(false);
                        }
                    }
                },
            ]
        );
    };

    const getGoalLabel = (goal: string | null) => {
        const map: Record<string, string> = { lose_fat: '🔥 Perder Grasa', maintain: '⚖️ Mantener', gain_muscle: '💪 Ganar Músculo' };
        return map[goal || ''] || '—';
    };

    const getMacros = () => {
        const d = plan?.plan_data?.weeks?.[0]?.days?.[0];
        if (!d) return null;
        return {
            cal: d.targetCalories || d.target_calories,
            p: d.targetProtein || d.target_protein,
            c: d.targetCarbs || d.target_carbs,
            f: d.targetFat || d.target_fat,
        };
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#F7931E" style={{ marginTop: 100 }} />
            </SafeAreaView>
        );
    }

    if (!plan) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No se encontró el plan de nutrición.</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const macros = getMacros();
    const isAlreadyHandled = assignment?.status === 'accepted' || assignment?.status === 'rejected';

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Dieta Asignada</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Plan card */}
                <View style={styles.planCard}>
                    <Text style={styles.planName}>{plan.plan_name}</Text>
                    {plan.description && <Text style={styles.planDesc}>{plan.description}</Text>}

                    <View style={styles.goalRow}>
                        <Text style={styles.goalLabel}>Objetivo:</Text>
                        <Text style={styles.goalValue}>{getGoalLabel(plan.nutrition_goal)}</Text>
                    </View>

                    {macros && (
                        <View style={styles.macrosRow}>
                            <View style={[styles.macroPill, { backgroundColor: '#ff6b6b22' }]}>
                                <Text style={[styles.macroText, { color: '#ff6b6b' }]}>{macros.cal} kcal</Text>
                            </View>
                            <View style={[styles.macroPill, { backgroundColor: '#4dabf722' }]}>
                                <Text style={[styles.macroText, { color: '#4dabf7' }]}>P: {macros.p}g</Text>
                            </View>
                            <View style={[styles.macroPill, { backgroundColor: '#ffd43b22' }]}>
                                <Text style={[styles.macroText, { color: '#ffd43b' }]}>C: {macros.c}g</Text>
                            </View>
                            <View style={[styles.macroPill, { backgroundColor: '#69db7c22' }]}>
                                <Text style={[styles.macroText, { color: '#69db7c' }]}>F: {macros.f}g</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Message from nutritionist */}
                {assignment?.message && (
                    <View style={styles.messageCard}>
                        <Text style={styles.messageLabel}>💬 Mensaje de tu nutricionista:</Text>
                        <Text style={styles.messageText}>{assignment.message}</Text>
                    </View>
                )}

                {/* Status */}
                {isAlreadyHandled && (
                    <View style={styles.statusCard}>
                        <Text style={styles.statusText}>
                            {assignment?.status === 'accepted' ? '✅ Ya aceptaste esta dieta' : '❌ Ya rechazaste esta dieta'}
                        </Text>
                    </View>
                )}

                {/* Actions */}
                {!isAlreadyHandled && (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={accepting || rejecting}>
                            {accepting ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={22} color="#000" />
                                    <Text style={styles.acceptBtnText}>Aceptar Dieta</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.rejectBtn} onPress={handleReject} disabled={accepting || rejecting}>
                            {rejecting ? (
                                <ActivityIndicator color="#f44336" />
                            ) : (
                                <>
                                    <Ionicons name="close-circle" size={22} color="#f44336" />
                                    <Text style={styles.rejectBtnText}>Rechazar</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    headerBackBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    scrollContent: { padding: 20 },
    planCard: { backgroundColor: '#111', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
    planName: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
    planDesc: { fontSize: 14, color: '#888', marginBottom: 12 },
    goalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    goalLabel: { fontSize: 14, color: '#888' },
    goalValue: { fontSize: 14, color: '#F7931E', fontWeight: '600' },
    macrosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    macroPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    macroText: { fontSize: 13, fontWeight: '600' },
    messageCard: { backgroundColor: '#111', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F7931E33' },
    messageLabel: { fontSize: 14, color: '#F7931E', fontWeight: '600', marginBottom: 8 },
    messageText: { fontSize: 15, color: '#ddd', lineHeight: 22 },
    statusCard: { backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
    statusText: { fontSize: 15, color: '#888', fontWeight: '600' },
    actionsContainer: { gap: 12, marginTop: 8 },
    acceptBtn: { backgroundColor: '#F7931E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 },
    acceptBtnText: { fontSize: 16, fontWeight: '700', color: '#000' },
    rejectBtn: { backgroundColor: '#f4433611', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#f4433633' },
    rejectBtnText: { fontSize: 15, fontWeight: '600', color: '#f44336' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 16, color: '#888', marginBottom: 20, textAlign: 'center' },
    backBtn: { backgroundColor: '#222', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    backBtnText: { color: '#fff', fontWeight: '600' },
});
