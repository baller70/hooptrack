import SwiftUI

enum HT {
    static let ink = Color(red: 11/255, green: 18/255, blue: 32/255)
    static let slate = Color(red: 51/255, green: 65/255, blue: 85/255)
    static let orange = Color(red: 194/255, green: 65/255, blue: 12/255)
    static let green = Color(red: 21/255, green: 128/255, blue: 61/255)
    static let paper = Color(red: 248/255, green: 250/255, blue: 252/255)
    static let line = Color(red: 203/255, green: 213/255, blue: 225/255)
}

struct Panel<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .padding(16)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(HT.line))
    }
}

struct MetricPill: View {
    let title: LocalizedStringKey
    let value: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(HT.slate)
            Text(value)
                .font(.title3.weight(.semibold))
                .foregroundStyle(color)
                .minimumScaleFactor(0.75)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct RowBadge: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}
