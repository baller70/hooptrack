import SwiftUI

enum HT {
    static let ink = Color(red: 17/255, green: 24/255, blue: 39/255)
    static let slate = Color(red: 51/255, green: 65/255, blue: 85/255)
    static let orange = Color(red: 249/255, green: 115/255, blue: 22/255)
    static let teal = Color(red: 20/255, green: 184/255, blue: 166/255)
    static let paper = Color(red: 248/255, green: 250/255, blue: 252/255)
    static let line = Color(red: 226/255, green: 232/255, blue: 240/255)
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
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

